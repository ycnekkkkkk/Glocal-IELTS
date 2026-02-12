import re
from typing import Any, Dict, List

from ..models import Skill
from .ai_scoring_service import AIScoringService


class ScoringService:
    """
    Comprehensive scoring engine with AI-powered assessment.

    - Listening & Reading: answer-key based, with band conversion for 20 questions.
    - Speaking & Writing: AI-powered scoring using Gemini (with fallback to rule-based).
    """

    def __init__(self) -> None:
        self.ai_scorer = AIScoringService()

    LISTENING_BANDS: Dict[int, float] = {
        0: 0.0,
        1: 0.0,
        2: 2.5,
        3: 2.5,
        4: 3.0,
        5: 3.5,
        6: 4.0,
        7: 4.5,
        8: 5.0,
        9: 5.5,
        10: 5.5,
        11: 6.0,
        12: 6.0,
        13: 6.5,
        14: 7.0,
        15: 7.5,
        16: 8.0,
        17: 8.5,
        18: 8.5,
        19: 9.0,
        20: 9.0,
    }

    READING_BANDS: Dict[int, float] = LISTENING_BANDS.copy()

    @staticmethod
    def _norm(s: str) -> str:
        # Normalize strings for comparison:
        # - lowercased
        # - remove some punctuation (including brackets)
        # - collapse multiple spaces
        if not s:
            return ""
        # Replace common bracket characters with spaces so their content is still compared
        for ch in "()[]{}":
            s = s.replace(ch, " ")
        return " ".join(s.lower().strip().rstrip(".,;:!?").split())

    def _compare(self, user_answer: str, correct_answer: str) -> bool:
        if not user_answer or not correct_answer:
            return False
        return self._norm(user_answer) == self._norm(correct_answer)

    def _compare_with_label_fallback(
        self, user_answer: str, correct_answer: str
    ) -> bool:
        """
        Compare answers with a fallback for label-based options.

        Handles cases like:
        - user: "B. 21-25 participants", correct: "B"
        - user: "i. Advantages for communities", correct: "i"
        """
        if not user_answer or not correct_answer:
            return False

        # First try full-text comparison
        if self._compare(user_answer, correct_answer):
            return True

        # Fallback: compare extracted labels (for multiple_choice / classification style)
        user_label = self._extract_option_label(user_answer)
        expected_label = self._extract_option_label(correct_answer)

        if not user_label or not expected_label:
            return False

        return self._compare(user_label, expected_label)

    # ---------- LISTENING ----------

    def _parse_matching_answer(self, answer_str: str) -> Dict[str, str]:
        """Parse matching answer like 'A:i, B:ii, C:iii' or 'statement:A, statement:B' into dict"""
        result = {}
        if not answer_str:
            return result
        pairs = [p.strip() for p in answer_str.split(",")]
        for pair in pairs:
            if ":" in pair:
                item, answer = pair.split(":", 1)
                item_normalized = self._norm(item.strip())
                answer_normalized = answer.strip()
                # Store both normalized and original case for flexible lookup
                result[item_normalized] = answer_normalized
                result[item.strip().upper()] = answer_normalized
                result[item.strip()] = answer_normalized
        return result

    def _extract_option_label(self, option_text: str) -> str:
        """Extract label from option text like 'iii. Heading text' -> 'iii' or 'A. Text' -> 'A' or 'B. Benefit' -> 'B'"""
        if not option_text:
            return option_text
        option_text = option_text.strip()

        # Try to extract label before first period (most common case: "i. Text" or "A. Text")
        parts = option_text.split(".", 1)
        if len(parts) > 1:
            label = parts[0].strip()
            # Check if it's a valid label:
            # - Single letter (A-Z)
            # - Single digit (0-9)
            # - Roman numeral (i, ii, iii, iv, v, vi, vii, viii, ix, x, xi, xii, xiii, xiv, xv, ...)
            if label:
                label_lower = label.lower()
                # Check roman numerals (common ones: i-xx, and pattern matching)
                roman_pattern = r"^[ivxlcdm]+$"
                if (
                    (len(label) == 1 and label.isalpha())
                    or label.isdigit()
                    or re.match(roman_pattern, label_lower)
                ):
                    return label
                # Also check common roman numerals list
                common_romans = [
                    "i",
                    "ii",
                    "iii",
                    "iv",
                    "v",
                    "vi",
                    "vii",
                    "viii",
                    "ix",
                    "x",
                    "xi",
                    "xii",
                    "xiii",
                    "xiv",
                    "xv",
                    "xvi",
                    "xvii",
                    "xviii",
                    "xix",
                    "xx",
                ]
                if label_lower in common_romans:
                    return label

        # If no period, try to extract first word/character
        first_part = option_text.split()[0] if option_text else ""
        if first_part:
            first_lower = first_part.lower()
            # Check if first part is a valid label
            if (len(first_part) == 1 and first_part.isalpha()) or first_part.isdigit():
                return first_part
            # Check roman numeral pattern
            roman_pattern = r"^[ivxlcdm]+$"
            if re.match(roman_pattern, first_lower):
                return first_part

        # Last resort: try to match pattern at the start (e.g., "i The Rise" -> "i")
        # Match single letter, digit, or roman numeral at the start
        match = re.match(r"^([A-Za-z]|\d+|[ivxlcdm]+)", option_text, re.IGNORECASE)
        if match:
            return match.group(1)

        return option_text

    def _extract_paragraph_id(self, item_str: str) -> str:
        """Extract paragraph identifier from item string like 'Paragraph B' -> 'B' or 'A' -> 'A'"""
        if not item_str:
            return item_str
        item_str = str(item_str).strip()
        # If it's just a letter/number, return it
        if len(item_str) == 1 and (item_str.isalpha() or item_str.isdigit()):
            return item_str.upper()
        # Try to extract from "Paragraph X" format
        if "paragraph" in item_str.lower():
            parts = item_str.split()
            for part in parts:
                part_clean = part.strip().rstrip(".,;:!?")
                if len(part_clean) == 1 and part_clean.isalpha():
                    return part_clean.upper()
        # Try to extract last single character (likely the paragraph letter)
        words = item_str.split()
        if words:
            last_word = words[-1].strip().rstrip(".,;:!?")
            if len(last_word) == 1 and last_word.isalpha():
                return last_word.upper()
        # Return original if can't extract
        return item_str

    def score_listening(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        sections = content.get("listening", {}).get("sections", [])
        correct = 0
        total = 0
        detailed: List[Dict[str, Any]] = []
        type_stats: Dict[str, Dict[str, int]] = {}

        for section in sections:
            sid = section.get("id")
            for q in section.get("questions", []):
                qid = q.get("id")
                q_type = q.get("question_type", q.get("type", "unknown"))
                items = q.get("items", [])

                # Handle matching questions with items
                if items and len(items) > 0:
                    correct_answers = self._parse_matching_answer(
                        str(q.get("correct_answer", ""))
                    )
                    for item in items:
                        item_str = str(item).strip()
                        item_normalized = self._norm(item_str)  # Normalize for lookup
                        # Extract paragraph identifier for matching_headings (e.g., "Paragraph B" -> "B")
                        paragraph_id = (
                            self._extract_paragraph_id(item_str)
                            if q_type
                            in ["matching_headings", "matching_headings_single"]
                            else None
                        )
                        key = f"listening_s{sid}_q{qid}_{item_str}"
                        user = answers.get(key, "")
                        # Try multiple lookup methods for flexible matching
                        expected = (
                            (
                                correct_answers.get(paragraph_id)
                                if paragraph_id
                                else None
                            )
                            or correct_answers.get(item_normalized)
                            or correct_answers.get(item_str.upper())
                            or correct_answers.get(item_str)
                            or ""
                        )
                        # For matching_headings and classification, find full text from options for display
                        expected_display = (
                            expected  # Default to label or expected value
                        )
                        options = q.get("options", [])

                        if q_type in ["matching_headings", "matching_headings_single"]:
                            # Matching headings: expected is label (e.g., "i"), find full text from options
                            if expected and options:
                                for opt in options:
                                    opt_str = (
                                        str(opt).strip()
                                        if isinstance(opt, str)
                                        else str(
                                            opt.get("text", opt.get("label", ""))
                                        ).strip()
                                    )
                                    opt_label = self._extract_option_label(opt_str)
                                    if opt_label.lower() == expected.strip().lower():
                                        expected_display = (
                                            opt_str  # Use full text for display
                                        )
                                        break

                            # Compare: extract label from user answer vs expected label
                            # Extract label from user answer (handles cases like "i. The Rise..." -> "i")
                            user_label = (
                                self._extract_option_label(user) if user else ""
                            )
                            # Extract label from expected answer (handles cases where expected might be "i. Text" or just "i")
                            expected_label_raw = (
                                self._extract_option_label(expected) if expected else ""
                            )
                            # If extraction didn't work, use expected as-is (it might already be just a label)
                            expected_label = (
                                expected_label_raw
                                if expected_label_raw and expected_label_raw != expected
                                else (expected.strip() if expected else "")
                            )

                            # Normalize both labels for comparison
                            user_label_normalized = (
                                self._norm(user_label) if user_label else ""
                            )
                            expected_label_normalized = (
                                self._norm(expected_label) if expected_label else ""
                            )

                            # Primary comparison: normalized label vs normalized label
                            if expected_label_normalized and user_label_normalized:
                                is_correct = (
                                    user_label_normalized == expected_label_normalized
                                )
                            elif not user_label_normalized and user and expected:
                                # Fallback: if label extraction failed, try comparing with _compare_with_label_fallback
                                is_correct = self._compare_with_label_fallback(
                                    user, expected
                                )
                            else:
                                is_correct = False

                            # Debug: print comparison details if mismatch
                            if not is_correct and expected_label:
                                print(
                                    f"DEBUG matching_headings: item='{item_str}', paragraph_id='{paragraph_id}', user='{user}', user_label='{user_label}', user_normalized='{user_label_normalized}', expected='{expected}', expected_label='{expected_label}', expected_normalized='{expected_label_normalized}', match={is_correct}"
                                )
                            elif not expected_label:
                                print(
                                    f"WARNING: No expected_label found for item '{item_str}', paragraph_id='{paragraph_id}', expected='{expected}', correct_answers keys: {list(correct_answers.keys())}"
                                )
                        elif q_type == "classification":
                            # Classification: expected is label (e.g., "B"), find full text from options
                            if expected and options:
                                for opt in options:
                                    opt_str = (
                                        str(opt).strip()
                                        if isinstance(opt, str)
                                        else str(
                                            opt.get("text", opt.get("label", ""))
                                        ).strip()
                                    )
                                    opt_label = self._extract_option_label(opt_str)
                                    if opt_label.lower() == expected.strip().lower():
                                        expected_display = (
                                            opt_str  # Use full text for display
                                        )
                                        break

                            # Compare: extract label from user answer vs expected label
                            # Extract label from user answer (handles cases like "A. Benefit" -> "A")
                            user_label = (
                                self._extract_option_label(user) if user else ""
                            )
                            # Extract label from expected answer (handles cases where expected might be "A. Text" or just "A")
                            expected_label_raw = (
                                self._extract_option_label(expected) if expected else ""
                            )
                            # If extraction didn't work, use expected as-is (it might already be just a label)
                            expected_label = (
                                expected_label_raw
                                if expected_label_raw and expected_label_raw != expected
                                else (expected.strip() if expected else "")
                            )

                            # Normalize both labels for comparison
                            user_label_normalized = (
                                self._norm(user_label) if user_label else ""
                            )
                            expected_label_normalized = (
                                self._norm(expected_label) if expected_label else ""
                            )

                            # Primary comparison: normalized label vs normalized label
                            if expected_label_normalized and user_label_normalized:
                                is_correct = (
                                    user_label_normalized == expected_label_normalized
                                )
                            elif not user_label_normalized and user and expected:
                                # Fallback: if label extraction failed, try comparing with _compare_with_label_fallback
                                is_correct = self._compare_with_label_fallback(
                                    user, expected
                                )
                            else:
                                is_correct = False

                            # Debug: print comparison details if mismatch
                            if not is_correct and expected_label:
                                print(
                                    f"DEBUG classification: item='{item_str}', user='{user}', user_label='{user_label}', user_normalized='{user_label_normalized}', expected='{expected}', expected_label='{expected_label}', expected_normalized='{expected_label_normalized}', match={is_correct}"
                                )
                        else:
                            # Other matching types (matching_information, etc.)
                            is_correct = (
                                self._compare(user, expected) if expected else False
                            )

                        total += 1
                        if is_correct:
                            correct += 1

                        detailed.append(
                            {
                                "section_id": sid,
                                "question_id": qid,
                                "item": item_str,
                                "question_type": q_type,
                                "user_answer": user,
                                "correct_answer": expected_display,  # Use full text for display
                                "is_correct": is_correct,
                            }
                        )

                        if q_type not in type_stats:
                            type_stats[q_type] = {"correct": 0, "total": 0}
                        type_stats[q_type]["total"] += 1
                        if is_correct:
                            type_stats[q_type]["correct"] += 1
                else:
                    # Regular single-answer question
                    key = f"listening_s{sid}_q{qid}"
                    user = answers.get(key, "")
                    expected = str(q.get("correct_answer", ""))

                    # Use label-aware comparison for choice-based questions
                    if q.get("type") in [
                        "multiple_choice",
                        "classification",
                        "matching",
                        "true_false_not_given",
                        "yes_no_not_given",
                    ]:
                        is_correct = self._compare_with_label_fallback(user, expected)
                    else:
                        is_correct = self._compare(user, expected)

                    total += 1
                    if is_correct:
                        correct += 1

                    detailed.append(
                        {
                            "section_id": sid,
                            "question_id": qid,
                            "question_type": q_type,
                            "user_answer": user,
                            "correct_answer": expected,
                            "is_correct": is_correct,
                        }
                    )

                    if q_type not in type_stats:
                        type_stats[q_type] = {"correct": 0, "total": 0}
                    type_stats[q_type]["total"] += 1
                    if is_correct:
                        type_stats[q_type]["correct"] += 1

        band = self.LISTENING_BANDS.get(correct, 0.0)

        qtype_analysis: Dict[str, Any] = {}
        for t, st in type_stats.items():
            acc = (st["correct"] / st["total"] * 100) if st["total"] else 0.0
            qtype_analysis[t] = {
                "correct": st["correct"],
                "total": st["total"],
                "accuracy": round(acc, 1),
                "performance": (
                    "strong" if acc >= 70 else "moderate" if acc >= 50 else "weak"
                ),
            }

        return {
            "raw_score": correct,
            "total_questions": total,
            "band": round(band, 1),
            "detailed_results": detailed,
            "question_type_analysis": qtype_analysis,
        }

    # ---------- READING ----------

    def score_reading(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        passages = content.get("reading", {}).get("passages", [])
        correct = 0  # Use float for fractional scoring
        total_questions = 0  # Count actual questions, not items
        detailed: List[Dict[str, Any]] = []
        type_stats: Dict[str, Dict[str, int]] = {}

        for passage in passages:
            pid = passage.get("id")
            for q in passage.get("questions", []):
                qid = q.get("id")
                # question_type is a detailed tag (e.g. "reading_matching_headings"),
                # while type is the structural type (e.g. "matching_headings").
                q_type = q.get("question_type", q.get("type", "unknown"))
                base_type = q.get("type", "")
                items = q.get("items", [])

                # Handle matching questions with items
                if items and len(items) > 0:
                    correct_answers = self._parse_matching_answer(
                        str(q.get("correct_answer", ""))
                    )
                    # Count this as 1 question, but score based on items
                    # total_questions += 1
                    item_correct = 0
                    item_total = len(items)

                    for item in items:
                        item_str = str(item).strip()
                        item_normalized = self._norm(item_str)  # Normalize for lookup
                        # Determine if this is a matching_headings-style question
                        is_matching_headings = (
                            base_type == "matching_headings"
                            or "matching_headings" in str(q_type)
                        )
                        # Extract paragraph identifier for matching_headings (e.g., "Paragraph B" -> "B")
                        paragraph_id = (
                            self._extract_paragraph_id(item_str)
                            if is_matching_headings
                            else None
                        )
                        key = f"reading_p{pid}_q{qid}_{item_str}"
                        user = answers.get(key, "")
                        # Try multiple lookup methods for flexible matching
                        expected = (
                            (
                                correct_answers.get(paragraph_id)
                                if paragraph_id
                                else None
                            )
                            or correct_answers.get(item_normalized)
                            or correct_answers.get(item_str.upper())
                            or correct_answers.get(item_str)
                            or ""
                        )

                        # If expected is empty, try to extract directly from correct_answer string
                        if not expected:
                            correct_answer_str = str(q.get("correct_answer", ""))
                            if correct_answer_str:
                                # Parse correct_answer to find answer for this item
                                # Format: "A:i, B:ii, C:iii" or "item1:B, item2:A"
                                pairs = [
                                    p.strip() for p in correct_answer_str.split(",")
                                ]
                                for pair in pairs:
                                    if ":" in pair:
                                        item_part, answer_part = pair.split(":", 1)
                                        item_part = item_part.strip()
                                        answer_part = answer_part.strip()
                                        # Check if this pair matches our item
                                        # Try multiple matching strategies
                                        if (
                                            paragraph_id
                                            and item_part.upper()
                                            == paragraph_id.upper()
                                        ):
                                            expected = answer_part
                                            break
                                        elif item_part.upper() == item_str.upper():
                                            expected = answer_part
                                            break
                                        elif item_part == item_str:
                                            expected = answer_part
                                            break
                                        elif self._norm(item_part) == item_normalized:
                                            expected = answer_part
                                            break
                                        # Also try matching normalized versions
                                        elif self._norm(item_part) == self._norm(
                                            item_str
                                        ):
                                            expected = answer_part
                                            break

                            # Debug: if still not found, log the issue
                            if not expected:
                                print(
                                    f"WARNING: Could not find expected answer for item '{item_str}' (paragraph_id='{paragraph_id}') in correct_answer '{correct_answer_str}'. correct_answers keys: {list(correct_answers.keys())}"
                                )

                        # For matching_headings and classification, find full text from options for display
                        expected_display = (
                            expected if expected else "(No answer provided)"
                        )  # Default to label or expected value
                        options = q.get("options", [])

                        if is_matching_headings:
                            # Matching headings: expected is label (e.g., "i"), find full text from options
                            if expected and options:
                                for opt in options:
                                    opt_str = (
                                        str(opt).strip()
                                        if isinstance(opt, str)
                                        else str(
                                            opt.get("text", opt.get("label", ""))
                                        ).strip()
                                    )
                                    opt_label = self._extract_option_label(opt_str)
                                    if opt_label.lower() == expected.strip().lower():
                                        expected_display = (
                                            opt_str  # Use full text for display
                                        )
                                        break
                            elif not expected:
                                # Last resort: try to parse correct_answer string directly with more flexible matching
                                correct_answer_str = str(q.get("correct_answer", ""))
                                if correct_answer_str:
                                    # Parse correct_answer to find answer for this specific paragraph
                                    pairs = [
                                        p.strip() for p in correct_answer_str.split(",")
                                    ]
                                    for pair in pairs:
                                        if ":" in pair:
                                            item_part, answer_part = pair.split(":", 1)
                                            item_part = item_part.strip()
                                            answer_part = answer_part.strip()
                                            # Try multiple matching strategies
                                            if (
                                                (
                                                    paragraph_id
                                                    and item_part.upper()
                                                    == paragraph_id.upper()
                                                )
                                                or (
                                                    item_part.upper()
                                                    == item_str.upper()
                                                )
                                                or (item_part == item_str)
                                                or (
                                                    self._norm(item_part)
                                                    == item_normalized
                                                )
                                                or (
                                                    self._norm(item_part)
                                                    == self._norm(item_str)
                                                )
                                            ):
                                                expected = answer_part
                                                # Try to find full text from options
                                                if options:
                                                    for opt in options:
                                                        opt_str = (
                                                            str(opt).strip()
                                                            if isinstance(opt, str)
                                                            else str(
                                                                opt.get(
                                                                    "text",
                                                                    opt.get(
                                                                        "label", ""
                                                                    ),
                                                                )
                                                            ).strip()
                                                        )
                                                        opt_label = (
                                                            self._extract_option_label(
                                                                opt_str
                                                            )
                                                        )
                                                        if (
                                                            opt_label.lower()
                                                            == answer_part.strip().lower()
                                                        ):
                                                            expected_display = opt_str
                                                            break
                                                    if (
                                                        expected_display
                                                        == "(No answer provided)"
                                                    ):
                                                        expected_display = answer_part  # Use label if full text not found
                                                else:
                                                    expected_display = answer_part
                                                break
                                    # If still not found, show the raw correct_answer
                                    if not expected:
                                        expected_display = (
                                            f"(Answer in: {correct_answer_str})"
                                        )

                            # Compare: extract label from user answer vs expected label
                            # Extract label from user answer (handles cases like "i. The Rise..." -> "i")
                            user_label = (
                                self._extract_option_label(user) if user else ""
                            )
                            # Extract label from expected answer (handles cases where expected might be "i. Text" or just "i")
                            expected_label_raw = (
                                self._extract_option_label(expected) if expected else ""
                            )
                            # If extraction didn't work, use expected as-is (it might already be just a label)
                            expected_label = (
                                expected_label_raw
                                if expected_label_raw and expected_label_raw != expected
                                else (expected.strip() if expected else "")
                            )

                            # Normalize both labels for comparison
                            user_label_normalized = (
                                self._norm(user_label) if user_label else ""
                            )
                            expected_label_normalized = (
                                self._norm(expected_label) if expected_label else ""
                            )

                            # Primary comparison: normalized label vs normalized label
                            if expected_label_normalized and user_label_normalized:
                                is_correct = (
                                    user_label_normalized == expected_label_normalized
                                )
                            elif not user_label_normalized and user and expected:
                                # Fallback: if label extraction failed, try comparing with _compare_with_label_fallback
                                is_correct = self._compare_with_label_fallback(
                                    user, expected
                                )
                            else:
                                is_correct = False

                            # Debug: print comparison details if mismatch
                            if not is_correct and expected_label:
                                print(
                                    f"DEBUG matching_headings: item='{item_str}', paragraph_id='{paragraph_id}', user='{user}', user_label='{user_label}', user_normalized='{user_label_normalized}', expected='{expected}', expected_label='{expected_label}', expected_normalized='{expected_label_normalized}', match={is_correct}"
                                )
                            elif not expected_label:
                                print(
                                    f"WARNING: No expected_label found for item '{item_str}', paragraph_id='{paragraph_id}', expected='{expected}', correct_answers keys: {list(correct_answers.keys())}"
                                )
                        elif base_type == "classification":
                            # Classification: expected is label (e.g., "B"), find full text from options
                            if expected and options:
                                for opt in options:
                                    opt_str = (
                                        str(opt).strip()
                                        if isinstance(opt, str)
                                        else str(
                                            opt.get("text", opt.get("label", ""))
                                        ).strip()
                                    )
                                    opt_label = self._extract_option_label(opt_str)
                                    if opt_label.lower() == expected.strip().lower():
                                        expected_display = (
                                            opt_str  # Use full text for display
                                        )
                                        break

                            # Compare: extract label from user answer vs expected label
                            # Extract label from user answer (handles cases like "A. Benefit" -> "A")
                            user_label = (
                                self._extract_option_label(user) if user else ""
                            )
                            # Extract label from expected answer (handles cases where expected might be "A. Text" or just "A")
                            expected_label_raw = (
                                self._extract_option_label(expected) if expected else ""
                            )
                            # If extraction didn't work, use expected as-is (it might already be just a label)
                            expected_label = (
                                expected_label_raw
                                if expected_label_raw and expected_label_raw != expected
                                else (expected.strip() if expected else "")
                            )

                            # Normalize both labels for comparison
                            user_label_normalized = (
                                self._norm(user_label) if user_label else ""
                            )
                            expected_label_normalized = (
                                self._norm(expected_label) if expected_label else ""
                            )

                            # Primary comparison: normalized label vs normalized label
                            if expected_label_normalized and user_label_normalized:
                                is_correct = (
                                    user_label_normalized == expected_label_normalized
                                )
                            elif not user_label_normalized and user and expected:
                                # Fallback: if label extraction failed, try comparing with _compare_with_label_fallback
                                is_correct = self._compare_with_label_fallback(
                                    user, expected
                                )
                            else:
                                is_correct = False

                            # Debug: print comparison details if mismatch
                            if not is_correct and expected_label:
                                print(
                                    f"DEBUG classification: item='{item_str}', user='{user}', user_label='{user_label}', user_normalized='{user_label_normalized}', expected='{expected}', expected_label='{expected_label}', expected_normalized='{expected_label_normalized}', match={is_correct}"
                                )
                        else:
                            # Other matching types (matching_information, etc.)
                            is_correct = (
                                self._compare(user, expected) if expected else False
                            )

                        # Track item correctness for this question
                        if is_correct:
                            item_correct += 1

                        detailed.append(
                            {
                                "passage_id": pid,
                                "question_id": qid,
                                "item": item_str,
                                "question_type": q_type,
                                "user_answer": user,
                                "correct_answer": expected_display,  # Use full text for display
                                "is_correct": is_correct,
                            }
                        )

                        if q_type not in type_stats:
                            type_stats[q_type] = {"correct": 0, "total": 0}
                        type_stats[q_type]["total"] += 1
                        if is_correct:
                            type_stats[q_type]["correct"] += 1

                    # After processing all items, add fractional score for this question
                    # Each matching question = 1 point, divided by number of items
                    # question_score = (
                    #     item_correct / item_total if item_total > 0 else 0.0
                    # )
                    # correct += question_score
                    # Each item = 1 IELTS question
                    total_questions += item_total
                    correct += item_correct

                else:
                    # Regular single-answer question
                    key = f"reading_p{pid}_q{qid}"
                    user = answers.get(key, "")
                    expected = str(q.get("correct_answer", ""))

                    # Use label-aware comparison for choice-based questions
                    if q.get("type") in [
                        "multiple_choice",
                        "classification",
                        "matching",
                        "true_false_not_given",
                        "yes_no_not_given",
                    ]:
                        is_correct = self._compare_with_label_fallback(user, expected)
                    else:
                        is_correct = self._compare(user, expected)

                    total_questions += 1
                    if is_correct:
                        correct += 1

                    detailed.append(
                        {
                            "passage_id": pid,
                            "question_id": qid,
                            "question_type": q_type,
                            "user_answer": user,
                            "correct_answer": expected,
                            "is_correct": is_correct,
                        }
                    )

                    if q_type not in type_stats:
                        type_stats[q_type] = {"correct": 0, "total": 0}
                    type_stats[q_type]["total"] += 1
                    if is_correct:
                        type_stats[q_type]["correct"] += 1

        # Convert fractional score to integer for band lookup
        # Scale to 20 questions: if we have 20 questions and correct is fractional, round to nearest integer
        raw_score_for_band = int(correct)
        # Ensure it's within valid range for band lookup
        raw_score_for_band = max(0, min(20, raw_score_for_band))
        band = self.READING_BANDS.get(raw_score_for_band, 0.0)

        qtype_analysis: Dict[str, Any] = {}
        for t, st in type_stats.items():
            acc = (st["correct"] / st["total"] * 100) if st["total"] else 0.0
            qtype_analysis[t] = {
                "correct": st["correct"],
                "total": st["total"],
                "accuracy": round(acc, 1),
                "performance": (
                    "strong" if acc >= 70 else "moderate" if acc >= 50 else "weak"
                ),
            }

        return {
            "raw_score": correct,  # Show fractional score with 2 decimals
            "total_questions": total_questions,  # Actual number of questions (should be 20)
            "band": round(band, 1),
            "detailed_results": detailed,
            "question_type_analysis": qtype_analysis,
        }

    # ---------- SPEAKING ----------

    def score_speaking(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI-powered Speaking scoring using Gemini.
        Analyzes actual content, grammar, vocabulary, and fluency.
        Falls back to rule-based if AI fails.
        """
        print("Using AI-powered Speaking scoring...")
        return self.ai_scorer.score_speaking_with_ai(answers)

    # ---------- WRITING ----------

    def score_writing(
        self, answers: Dict[str, Any], content: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        AI-powered Writing scoring using Gemini.
        Analyzes task achievement, coherence, lexical resource, and grammar.
        Falls back to rule-based if AI fails.
        """
        print("Using AI-powered Writing scoring...")
        if content is None:
            content = {}
        return self.ai_scorer.score_writing_with_ai(answers, content)

    # ---------- DISPATCH ----------

    def score_skill(
        self, skill: Skill, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        if skill == Skill.LISTENING:
            return self.score_listening(content, answers)
        if skill == Skill.READING:
            return self.score_reading(content, answers)
        if skill == Skill.SPEAKING:
            return self.score_speaking(answers)
        if skill == Skill.WRITING:
            return self.score_writing(answers, content)
        raise ValueError(f"Unsupported skill: {skill}")
