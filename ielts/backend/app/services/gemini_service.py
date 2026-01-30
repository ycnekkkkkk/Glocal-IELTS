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
    """Service for interacting with Google Gemini API (free tier) with smart key rotation"""

    # Class-level variables to track key usage
    _key1_last_used = 0
    _key2_last_used = 0
    _current_key_index = 1
    _key1 = None
    _key2 = None
    _key1_invalid = False
    _key2_invalid = False
    _cooldown_seconds = 300  # 5 minutes

    def __init__(self):
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

    def _switch_key(self, key_index: int):
        """Switch to a specific API key"""
        if key_index == 1:
            if not self._key1:
                raise ValueError("GEMINI_API_KEY not available")
            genai.configure(api_key=self._key1)
            self._current_key_index = 1
            self._key1_last_used = time.time()
            print(f"Switched to GEMINI_API_KEY (Key 1)")
        elif key_index == 2:
            if not self._key2:
                raise ValueError("GEMINI_API_KEY_BACKUP not available")
            genai.configure(api_key=self._key2)
            self._current_key_index = 2
            self._key2_last_used = time.time()
            print(f"Switched to GEMINI_API_KEY_BACKUP (Key 2)")
        else:
            raise ValueError("key_index must be 1 or 2")

    def _get_available_key(self) -> int:
        """Smart key selection logic"""
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
                if not self._key2_invalid:
                    return 2
                return 1
            else:
                return 1
        else:
            time_since_key2 = current_time - self._key2_last_used
            if time_since_key2 < self._cooldown_seconds:
                if not self._key1_invalid:
                    return 1
                return 2
            else:
                return 2

    def _ensure_available_key(self, force_key: Optional[int] = None):
        """Ensure we're using an available key (switch if needed)"""
        if force_key is not None:
            if force_key == 1 and not self._key1_invalid and self._key1:
                if self._current_key_index != 1:
                    self._switch_key(1)
                return
            elif force_key == 2 and not self._key2_invalid and self._key2:
                if self._current_key_index != 2:
                    self._switch_key(2)
                return
            else:
                print(
                    f"Warning: Forced key {force_key} is invalid, using auto selection"
                )

        target_key = self._get_available_key()
        if target_key != self._current_key_index:
            self._switch_key(target_key)
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
        """Generate content using Gemini API with smart key rotation"""
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
                or ("expired" in error_lower and "key" in error_lower)
                or ("invalid" in error_lower and "key" in error_lower)
            )

            if is_key_invalid:
                if self._current_key_index == 1:
                    self._key1_invalid = True
                    print(
                        f"ERROR: GEMINI_API_KEY (Key 1) is invalid/expired. Marking as invalid."
                    )
                else:
                    self._key2_invalid = True
                    print(
                        f"ERROR: GEMINI_API_KEY_BACKUP (Key 2) is invalid/expired. Marking as invalid."
                    )

            if is_key_invalid and self._key1 and self._key2:
                other_key = 2 if self._current_key_index == 1 else 1
                if (other_key == 1 and self._key1_invalid) or (
                    other_key == 2 and self._key2_invalid
                ):
                    raise ValueError(
                        f"Both API keys are invalid/expired. Please update them in .env file. "
                        f"Key 1 invalid: {self._key1_invalid}, Key 2 invalid: {self._key2_invalid}"
                    )

                print(
                    f"Key {self._current_key_index} is invalid, switching to Key {other_key}..."
                )
                self._switch_key(other_key)
                try:
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
                        f"Gemini API call succeeded after key switch, took {elapsed:.2f} seconds (using Key {self._current_key_index})"
                    )
                    return response.text
                except Exception as retry_error:
                    error_str_retry = str(retry_error)
                    error_lower_retry = error_str_retry.lower()
                    print(
                        f"Gemini API Error after key switch (invalid key): {retry_error}"
                    )

                    # Mark the switched key as invalid if it's also invalid/expired
                    if (
                        "invalid" in error_lower_retry
                        or "expired" in error_lower_retry
                        or "not found" in error_lower_retry
                    ):
                        if self._current_key_index == 1:
                            self._key1_invalid = True
                        else:
                            self._key2_invalid = True
                        print(f"Marked Key {self._current_key_index} as invalid")

                    raise retry_error

            if (
                ("429" in error_str or "quota" in error_lower or "rate" in error_lower)
                and self._key1
                and self._key2
            ):
                other_key = 2 if self._current_key_index == 1 else 1
                if (other_key == 1 and self._key1_invalid) or (
                    other_key == 2 and self._key2_invalid
                ):
                    print(
                        f"Rate limit detected but backup key is also invalid. Cannot switch."
                    )
                    raise e

                print(
                    f"Rate limit detected with Key {self._current_key_index}, switching to Key {other_key}..."
                )
                self._switch_key(other_key)
                try:
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
                        f"Gemini API call succeeded after key switch, took {elapsed:.2f} seconds (using Key {self._current_key_index})"
                    )
                    return response.text
                except Exception as retry_error:
                    error_str_retry = str(retry_error)
                    error_lower_retry = error_str_retry.lower()
                    print(
                        f"Gemini API Error after key switch (rate limit): {retry_error}"
                    )

                    # If both keys are exhausted, mark the switched key as invalid
                    if (
                        "429" in error_str_retry
                        or "quota" in error_lower_retry
                        or "rate limit" in error_lower_retry
                        or "ResourceExhausted" in str(type(retry_error).__name__)
                    ):
                        if self._current_key_index == 1:
                            self._key1_invalid = True
                        else:
                            self._key2_invalid = True
                        print(
                            f"Marked Key {self._current_key_index} as invalid due to quota/rate limit"
                        )

                    raise retry_error

            print(f"Gemini API Error: {e}")
            print(f"Error type: {type(e).__name__}")
            raise

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        force_key: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate JSON response from Gemini"""
        import json
        import re

        instruction = system_instruction or ""
        full_prompt = f"{instruction}\n\n{prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text."

        response_text = self.generate_content(
            full_prompt, temperature=0.3, force_key=force_key
        )

        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                print(
                    f"Successfully parsed JSON from response (length: {len(response_text)} chars)"
                )
                return parsed
            except json.JSONDecodeError as e:
                print(f"JSON decode error in matched group: {e}")
                print(f"Matched text (first 500 chars): {json_match.group()[:500]}")

        try:
            parsed = json.loads(response_text)
            print(f"Successfully parsed entire response as JSON")
            return parsed
        except json.JSONDecodeError as e:
            print(f"JSON decode error in full response: {e}")
            print(f"Response text (first 1000 chars): {response_text[:1000]}")
            raise ValueError(
                f"Could not parse JSON from response. Error: {str(e)}. Response preview: {response_text[:500]}"
            )
