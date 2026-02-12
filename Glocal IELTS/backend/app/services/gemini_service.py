import os
import time
import warnings
from typing import Dict, Any, Optional

from dotenv import load_dotenv

# Suppress deprecation warning for google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai

load_dotenv()


class GeminiService:
    """Service for interacting with Google Gemini API with smart key rotation."""

    _key1_last_used = 0
    _key2_last_used = 0
    _current_key_index = 1
    _key1: Optional[str] = None
    _key2: Optional[str] = None
    _key1_invalid = False
    _key2_invalid = False
    _cooldown_seconds = 300

    def __init__(self) -> None:
        self._key1 = os.getenv("GEMINI_API_KEY")
        self._key2 = os.getenv("GEMINI_API_KEY_BACKUP")

        if not self._key1 and not self._key2:
            raise ValueError(
                "GEMINI_API_KEY or GEMINI_API_KEY_BACKUP must be set in .env file"
            )

        if not self._key1:
            print("Warning: GEMINI_API_KEY not found, using GEMINI_API_KEY_BACKUP only")
            self._key1 = self._key2
            self._key2 = None

        if not self._key2:
            print("Warning: GEMINI_API_KEY_BACKUP not found, using GEMINI_API_KEY only")

        self._switch_key(1)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def _switch_key(self, key_index: int) -> None:
        if key_index == 1:
            if not self._key1:
                raise ValueError("GEMINI_API_KEY not available")
            genai.configure(api_key=self._key1)
            self._current_key_index = 1
            self._key1_last_used = time.time()
            print("Switched to GEMINI_API_KEY (Key 1)")
        elif key_index == 2:
            if not self._key2:
                raise ValueError("GEMINI_API_KEY_BACKUP not available")
            genai.configure(api_key=self._key2)
            self._current_key_index = 2
            self._key2_last_used = time.time()
            print("Switched to GEMINI_API_KEY_BACKUP (Key 2)")
        else:
            raise ValueError("key_index must be 1 or 2")

    def _get_available_key(self) -> int:
        current_time = time.time()

        if not self._key2:
            if self._key1_invalid:
                raise ValueError(
                    "GEMINI_API_KEY is invalid/expired. Please update it in .env file"
                )
            return 1
        if not self._key1:
            if self._key2_invalid:
                raise ValueError(
                    "GEMINI_API_KEY_BACKUP is invalid/expired. Please update it in .env file"
                )
            return 2

        if self._current_key_index == 1 and self._key1_invalid:
            if self._key2_invalid:
                raise ValueError(
                    "Both API keys are invalid/expired. Please update them in .env file"
                )
            return 2
        if self._current_key_index == 2 and self._key2_invalid:
            if self._key1_invalid:
                raise ValueError(
                    "Both API keys are invalid/expired. Please update them in .env file"
                )
            return 1

        if self._current_key_index == 1:
            time_since_key1 = current_time - self._key1_last_used
            if time_since_key1 < self._cooldown_seconds:
                return 2 if not self._key2_invalid else 1
            return 1
        else:
            time_since_key2 = current_time - self._key2_last_used
            if time_since_key2 < self._cooldown_seconds:
                return 1 if not self._key1_invalid else 2
            return 2

    def _ensure_available_key(self, force_key: Optional[int] = None) -> None:
        if force_key is not None:
            if force_key == 1 and not self._key1_invalid and self._key1:
                if self._current_key_index != 1:
                    self._switch_key(1)
                return
            if force_key == 2 and not self._key2_invalid and self._key2:
                if self._current_key_index != 2:
                    self._switch_key(2)
                return
            print(f"Warning: Forced key {force_key} is invalid, using auto selection")

        target = self._get_available_key()
        if target != self._current_key_index:
            self._switch_key(target)
        else:
            if self._current_key_index == 1:
                self._key1_last_used = time.time()
            else:
                self._key2_last_used = time.time()

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: int = 32768,
        force_key: Optional[int] = None,
    ) -> str:
        self._ensure_available_key(force_key=force_key)

        try:
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
            start_time = time.time()
            if system_instruction:
                response = self.model.generate_content(
                    f"{system_instruction}\n\n{prompt}",
                    generation_config=generation_config,
                )
            else:
                response = self.model.generate_content(
                    prompt, generation_config=generation_config
                )
            elapsed = time.time() - start_time
            print(
                f"Gemini API call took {elapsed:.2f} seconds (using Key {self._current_key_index})"
            )
            return response.text
        except Exception as e:
            error_str = str(e)
            error_lower = error_str.lower()
            is_key_invalid = (
                "api_key_invalid" in error_lower
                or "api key expired" in error_lower
                or "api key invalid" in error_lower
                or ("expired" in error_lower or "invalid" in error_lower)
                and "key" in error_lower
            )

            if is_key_invalid:
                if self._current_key_index == 1:
                    self._key1_invalid = True
                    print("ERROR: GEMINI_API_KEY (Key 1) is invalid/expired.")
                else:
                    self._key2_invalid = True
                    print("ERROR: GEMINI_API_KEY_BACKUP (Key 2) is invalid/expired.")

            if is_key_invalid and self._key1 and self._key2:
                other = 2 if self._current_key_index == 1 else 1
                if (other == 1 and self._key1_invalid) or (
                    other == 2 and self._key2_invalid
                ):
                    raise ValueError(
                        "Both API keys are invalid/expired. Please update them in .env file."
                    )
                print(
                    f"Key {self._current_key_index} invalid, switching to Key {other}"
                )
                self._switch_key(other)
                if system_instruction:
                    response = self.model.generate_content(
                        f"{system_instruction}\n\n{prompt}",
                        generation_config=generation_config,
                    )
                else:
                    response = self.model.generate_content(
                        prompt, generation_config=generation_config
                    )
                elapsed = time.time() - start_time
                print(
                    f"Gemini API call succeeded after key switch, took {elapsed:.2f} seconds"
                )
                return response.text

            if (
                ("429" in error_str or "quota" in error_lower or "rate" in error_lower)
                and self._key1
                and self._key2
            ):
                other = 2 if self._current_key_index == 1 else 1
                if (other == 1 and self._key1_invalid) or (
                    other == 2 and self._key2_invalid
                ):
                    print("Rate limit detected but backup key is also invalid.")
                    raise e
                print(
                    f"Rate limit detected with Key {self._current_key_index}, switching to Key {other}"
                )
                self._switch_key(other)
                if system_instruction:
                    response = self.model.generate_content(
                        f"{system_instruction}\n\n{prompt}",
                        generation_config=generation_config,
                    )
                else:
                    response = self.model.generate_content(
                        prompt, generation_config=generation_config
                    )
                elapsed = time.time() - start_time
                print(
                    f"Gemini API call succeeded after key switch, took {elapsed:.2f} seconds"
                )
                return response.text

            print(f"Gemini API Error: {e}")
            raise

    def _fix_incomplete_json(self, json_str: str) -> Optional[str]:
        """Try to fix incomplete JSON by closing strings, brackets, etc."""
        import json
        import re

        fixed = json_str

        # Fix unterminated strings: find last unclosed quote and close it
        # Count quotes (both single and double) - simple heuristic
        in_string = False
        escape_next = False
        quote_char = None
        last_quote_pos = -1

        for i, char in enumerate(fixed):
            if escape_next:
                escape_next = False
                continue
            if char == "\\":
                escape_next = True
                continue
            if char in ('"', "'"):
                if not in_string:
                    in_string = True
                    quote_char = char
                    last_quote_pos = i
                elif char == quote_char:
                    in_string = False
                    quote_char = None

        # If we're still in a string at the end, close it
        if in_string and last_quote_pos >= 0:
            # Find where the string should end (before next comma, }, or end)
            end_pos = len(fixed)
            for i in range(last_quote_pos + 1, len(fixed)):
                if fixed[i] in (",", "}", "]", "\n"):
                    end_pos = i
                    break
            fixed = fixed[:end_pos] + quote_char + fixed[end_pos:]

        # Fix missing closing braces/brackets
        open_braces = fixed.count("{")
        close_braces = fixed.count("}")
        open_brackets = fixed.count("[")
        close_brackets = fixed.count("]")

        if open_braces > close_braces:
            fixed += "}" * (open_braces - close_braces)
        if open_brackets > close_brackets:
            fixed += "]" * (open_brackets - close_brackets)

        return fixed if fixed != json_str else None

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        force_key: Optional[int] = None,
    ) -> Dict[str, Any]:
        import json
        import re

        instruction = system_instruction or ""
        full_prompt = (
            f"{instruction}\n\n{prompt}\n\nIMPORTANT: Return ONLY valid JSON, "
            "no markdown, no code blocks, no extra text."
        )
        response_text = self.generate_content(
            full_prompt, temperature=0.3, max_output_tokens=32768, force_key=force_key
        )

        # Step 1: Strip markdown code blocks if present
        cleaned_text = response_text.strip()
        # Remove ```json or ``` at start/end
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:].strip()
        elif cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:].strip()
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3].strip()

        # Step 2: Find the first complete JSON object by finding matching braces
        def find_complete_json(text: str) -> Optional[str]:
            """Find the first complete JSON object by matching braces."""
            start_idx = text.find("{")
            if start_idx == -1:
                return None
            
            brace_count = 0
            in_string = False
            escape_next = False
            quote_char = None
            
            for i in range(start_idx, len(text)):
                char = text[i]
                
                if escape_next:
                    escape_next = False
                    continue
                
                if char == "\\":
                    escape_next = True
                    continue
                
                if not in_string:
                    if char in ['"', "'"]:
                        in_string = True
                        quote_char = char
                    elif char == "{":
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            # Found complete JSON object
                            return text[start_idx:i+1]
                else:
                    if char == quote_char:
                        in_string = False
                        quote_char = None
            
            return None
        
        # Try to find complete JSON object
        json_str = find_complete_json(cleaned_text)
        if not json_str:
            # Fallback: try regex match
            json_match = re.search(r"\{.*\}", cleaned_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
            else:
                json_str = cleaned_text
        
        # Step 3: Try parsing the extracted JSON
        try:
            parsed = json.loads(json_str)
            print(f"Successfully parsed JSON from response (length: {len(json_str)} chars)")
            return parsed
        except json.JSONDecodeError as e:
            print(f"JSON decode error in extracted JSON: {e}")
            print(f"Extracted JSON (first 500 chars): {json_str[:500]}")
            # Try to fix incomplete JSON
            fixed_json = self._fix_incomplete_json(json_str)
            if fixed_json:
                try:
                    parsed = json.loads(fixed_json)
                    print("Successfully parsed JSON after fixing incomplete structure")
                    return parsed
                except json.JSONDecodeError as e2:
                    print(f"JSON decode error after fixing: {e2}")

        # Step 4: Try parsing cleaned text directly
        try:
            parsed = json.loads(cleaned_text)
            print("Successfully parsed cleaned response as JSON")
            return parsed
        except json.JSONDecodeError as e:
            print(f"JSON decode error in cleaned response: {e}")
            print(f"Cleaned text (first 1000 chars): {cleaned_text[:1000]}")

        # Step 5: Last resort - try original response
        try:
            parsed = json.loads(response_text)
            print("Successfully parsed original response as JSON")
            return parsed
        except json.JSONDecodeError as e:
            print(f"JSON decode error in original response: {e}")
            print(f"Response text (first 1000 chars): {response_text[:1000]}")
            raise ValueError(
                f"Could not parse JSON from response. Error: {str(e)}. "
                f"Response preview: {response_text[:500]}"
            )
