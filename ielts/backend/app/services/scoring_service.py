from typing import Dict, Any
from app.services.gemini_service import GeminiService
from app.models.test_session import Phase
import json
import re


class ScoringService:
    """Service for scoring test phases using Gemini with detailed analysis"""

    # IELTS Band conversion for Listening (20 questions)
    # Scaled from standard 40-question IELTS conversion table
    # Standard: 39-40=9.0, 37-38=8.5, 35-36=8.0, 33-34=7.5, 30-32=7.0, 27-29=6.5, 23-26=6.0, 19-22=5.5, 16-18=5.0, 13-15=4.5, 10-12=4.0, 8-9=3.5, 6-7=3.0, 4-5=2.5, 0-3=0.0
    # For 20 questions (half of 40), scale proportionally
    LISTENING_BANDS = {
        0: 0.0,  # 0-1 correct (0-5% of 40)
        1: 0.0,  # 0-1 correct
        2: 2.5,  # 2-3 correct (5-7.5% of 40)
        3: 2.5,  # 2-3 correct
        4: 3.0,  # 4-5 correct (10-12.5% of 40)
        5: 3.5,  # 5-6 correct (12.5-15% of 40)
        6: 4.0,  # 6-7 correct (15-17.5% of 40)
        7: 4.5,  # 7-8 correct (17.5-20% of 40)
        8: 5.0,  # 8-9 correct (20-22.5% of 40)
        9: 5.5,  # 9-10 correct (22.5-25% of 40)
        10: 5.5,  # 10-11 correct (25-27.5% of 40)
        11: 6.0,  # 11-12 correct (27.5-30% of 40)
        12: 6.0,  # 12-13 correct (30-32.5% of 40)
        13: 6.5,  # 13-14 correct (32.5-35% of 40)
        14: 7.0,  # 14-15 correct (35-37.5% of 40)
        15: 7.5,  # 15-16 correct (37.5-40% of 40)
        16: 8.0,  # 16-17 correct (40-42.5% of 40)
        17: 8.5,  # 17-18 correct (42.5-45% of 40)
        18: 8.5,  # 18-19 correct (45-47.5% of 40)
        19: 9.0,  # 19-20 correct (47.5-50% of 40)
        20: 9.0,  # 20 correct (50% of 40, perfect for 20-question test)
    }

    # IELTS Band conversion for Reading (20 questions)
    # Same scaling as Listening for consistency
    READING_BANDS = {
        0: 0.0,  # 0-1 correct
        1: 0.0,  # 0-1 correct
        2: 2.5,  # 2-3 correct
        3: 2.5,  # 2-3 correct
        4: 3.0,  # 4-5 correct
        5: 3.5,  # 5-6 correct
        6: 4.0,  # 6-7 correct
        7: 4.5,  # 7-8 correct
        8: 5.0,  # 8-9 correct
        9: 5.5,  # 9-10 correct
        10: 5.5,  # 10-11 correct
        11: 6.0,  # 11-12 correct
        12: 6.0,  # 12-13 correct
        13: 6.5,  # 13-14 correct
        14: 7.0,  # 14-15 correct
        15: 7.5,  # 15-16 correct
        16: 8.0,  # 16-17 correct
        17: 8.5,  # 17-18 correct
        18: 8.5,  # 18-19 correct
        19: 9.0,  # 19-20 correct
        20: 9.0,  # 20 correct (perfect score)
    }

    def __init__(self):
        self.gemini = GeminiService()

    def normalize_answer(self, answer: str) -> str:
        """Normalize answer for comparison"""
        if not answer:
            return ""
        normalized = answer.lower().strip()
        normalized = re.sub(r"\s+", " ", normalized)
        normalized = normalized.rstrip(".,;:")
        return normalized.strip()

    def compare_answers(self, user_answer: str, correct_answer: str) -> bool:
        """Compare answers with strict matching"""
        if not user_answer or not user_answer.strip():
            return False
        if not correct_answer or not correct_answer.strip():
            return False

        normalized_user = self.normalize_answer(user_answer)
        normalized_correct = self.normalize_answer(correct_answer)

        if not normalized_user:
            return False

        # Exact match
        if normalized_user == normalized_correct:
            return True

        # Check if correct answer is contained in user answer
        if len(normalized_user) >= len(normalized_correct) * 2:
            pattern = r"\b" + re.escape(normalized_correct) + r"\b"
            if re.search(pattern, normalized_user, re.IGNORECASE):
                return True
            words_correct = set(normalized_correct.split())
            words_user = set(normalized_user.split())
            if (
                words_correct
                and words_correct.issubset(words_user)
                and len(words_user) > len(words_correct)
            ):
                return True

        # Word-by-word comparison
        words_user = set(normalized_user.split())
        words_correct = set(normalized_correct.split())
        if len(words_user) > 1 and len(words_correct) > 1:
            intersection = words_user.intersection(words_correct)
            union = words_user.union(words_correct)
            if union:
                overlap_ratio = len(intersection) / len(union)
                if overlap_ratio >= 0.9 and len(words_user) == len(words_correct):
                    return True

        # Fuzzy matching for typos
        if len(normalized_correct.split()) <= 2 and len(normalized_user.split()) <= 2:
            if self._simple_similarity(normalized_user, normalized_correct) >= 0.95:
                return True

        return False

    def _simple_similarity(self, str1: str, str2: str) -> float:
        """Calculate simple similarity ratio"""
        if not str1 or not str2:
            return 0.0
        longer = str1 if len(str1) > len(str2) else str2
        shorter = str1 if len(str1) <= len(str2) else str2
        if not longer:
            return 1.0
        matches = 0
        shorter_idx = 0
        for char in longer:
            if shorter_idx < len(shorter) and char == shorter[shorter_idx]:
                matches += 1
                shorter_idx += 1
        return matches / len(longer) if longer else 0.0

    def score_listening(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Score Listening section and analyze question types"""
        correct_count = 0
        total_questions = 0
        detailed_results = []

        sections = content.get("listening", {}).get("sections", [])
        for section in sections:
            section_id = section.get("id")
            questions = section.get("questions", [])

            for question in questions:
                qid = question.get("id")
                question_type = question.get("type", "unknown")
                items = question.get("items", [])

                if items and len(items) > 0:
                    # Multi-item matching for Listening
                    correct_answer_str = str(question.get("correct_answer", ""))
                    correct_answers_dict = {}
                    if correct_answer_str:
                        # Handle format "A:i, B:ii" or "A: i, B: ii" or "A:i,B:ii"
                        pairs = [p.strip() for p in correct_answer_str.split(",")]
                        for pair in pairs:
                            if ":" in pair:
                                item, answer = pair.split(":", 1)
                                # Normalize both item and answer for consistent matching
                                item_key = item.strip().upper()
                                answer_value = answer.strip()
                                correct_answers_dict[item_key] = answer_value
                                # Also store with original case for flexibility
                                correct_answers_dict[item.strip()] = answer_value

                    for item in items:
                        total_questions += 1
                        # Handle both string and dict formats
                        item_value = (
                            item
                            if isinstance(item, str)
                            else (
                                item.get("item")
                                or item.get("id")
                                or item.get("text")
                                or str(item)
                            )
                        )
                        answer_key = f"listening_s{section_id}_q{qid}_{item_value}"
                        user_answer = answers.get(answer_key, "")
                        # Try to get correct answer with item as-is, then try uppercase
                        correct_answer = correct_answers_dict.get(
                            item_value, ""
                        ) or correct_answers_dict.get(str(item_value).upper(), "")

                        is_correct = (
                            self.compare_answers(user_answer, correct_answer)
                            if correct_answer
                            else False
                        )
                        if is_correct:
                            correct_count += 1

                        detailed_results.append(
                            {
                                "question_id": qid,
                                "item": item_value,
                                "section_id": section_id,
                                "question_type": question_type,
                                "user_answer": user_answer,
                                "correct_answer": correct_answer,
                                "is_correct": is_correct,
                            }
                        )
                else:
                    # Single answer question
                    total_questions += 1
                    user_answer = answers.get(f"listening_s{section_id}_q{qid}", "")
                    correct_answer = str(question.get("correct_answer", ""))

                    is_correct = self.compare_answers(user_answer, correct_answer)
                    if is_correct:
                        correct_count += 1

                    detailed_results.append(
                        {
                            "question_id": qid,
                            "section_id": section_id,
                            "question_type": question_type,
                            "user_answer": user_answer,
                            "correct_answer": correct_answer,
                            "is_correct": is_correct,
                        }
                    )

        raw_score = correct_count
        has_any_answer = False
        for section in sections:
            section_id = section.get("id")
            for q in section.get("questions", []):
                qid = q.get("id")
                items = q.get("items", [])

                if items and len(items) > 0:
                    for item in items:
                        # Handle both string and dict formats
                        item_value = (
                            item
                            if isinstance(item, str)
                            else (
                                item.get("item")
                                or item.get("id")
                                or item.get("text")
                                or str(item)
                            )
                        )
                        answer_key = f"listening_s{section_id}_q{qid}_{item_value}"
                        if answers.get(answer_key, "").strip():
                            has_any_answer = True
                            break
                    if has_any_answer:
                        break
                else:
                    if answers.get(f"listening_s{section_id}_q{qid}", "").strip():
                        has_any_answer = True
                        break
            if has_any_answer:
                break

        if not has_any_answer:
            band = 0.0
        elif raw_score == 0:
            band = 0.0
        else:
            band = self.LISTENING_BANDS.get(raw_score, 0.0)

        # Analyze question types performance
        question_type_analysis = self._analyze_question_types(detailed_results)

        return {
            "raw_score": raw_score,
            "total_questions": total_questions,
            "band": round(band, 1),
            "detailed_results": detailed_results,
            "question_type_analysis": question_type_analysis,
        }

    def score_reading(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Score Reading section (20 questions) and analyze question types"""
        correct_count = 0
        total_questions = 0
        detailed_results = []

        passages = content.get("reading", {}).get("passages", [])
        for passage in passages:
            passage_id = passage.get("id")
            questions = passage.get("questions", [])

            for question in questions:
                qid = question.get("id")
                question_type = question.get("type", "unknown")
                items = question.get("items", [])

                if items and len(items) > 0:
                    # Multi-item matching
                    correct_answer_str = str(question.get("correct_answer", ""))
                    correct_answers_dict = {}
                    if correct_answer_str:
                        # Handle format "A:i, B:ii" or "A: i, B: ii" or "A:i,B:ii"
                        pairs = [p.strip() for p in correct_answer_str.split(",")]
                        for pair in pairs:
                            if ":" in pair:
                                item, answer = pair.split(":", 1)
                                # Normalize both item and answer for consistent matching
                                item_key = item.strip().upper()
                                answer_value = answer.strip()
                                correct_answers_dict[item_key] = answer_value
                                # Also store with original case for flexibility
                                correct_answers_dict[item.strip()] = answer_value

                    for item in items:
                        total_questions += 1
                        # Handle both string and dict formats
                        item_value = (
                            item
                            if isinstance(item, str)
                            else (
                                item.get("item")
                                or item.get("id")
                                or item.get("text")
                                or str(item)
                            )
                        )
                        answer_key = f"reading_p{passage_id}_q{qid}_{item_value}"
                        user_answer = answers.get(answer_key, "")
                        # Try to get correct answer with item as-is, then try uppercase
                        correct_answer = correct_answers_dict.get(
                            item_value, ""
                        ) or correct_answers_dict.get(str(item_value).upper(), "")

                        is_correct = (
                            self.compare_answers(user_answer, correct_answer)
                            if correct_answer
                            else False
                        )
                        if is_correct:
                            correct_count += 1

                        detailed_results.append(
                            {
                                "question_id": qid,
                                "item": item_value,
                                "passage_id": passage_id,
                                "question_type": question_type,
                                "user_answer": user_answer,
                                "correct_answer": correct_answer,
                                "is_correct": is_correct,
                            }
                        )
                else:
                    # Single answer question
                    total_questions += 1
                    user_answer = answers.get(f"reading_p{passage_id}_q{qid}", "")
                    correct_answer = str(question.get("correct_answer", ""))

                    is_correct = self.compare_answers(user_answer, correct_answer)
                    if is_correct:
                        correct_count += 1

                    detailed_results.append(
                        {
                            "question_id": qid,
                            "passage_id": passage_id,
                            "question_type": question_type,
                            "user_answer": user_answer,
                            "correct_answer": correct_answer,
                            "is_correct": is_correct,
                        }
                    )

        raw_score = correct_count

        has_any_answer = False
        for passage in passages:
            for q in passage.get("questions", []):
                qid = q.get("id")
                passage_id = passage.get("id")
                items = q.get("items", [])

                if items and len(items) > 0:
                    for item in items:
                        # Handle both string and dict formats
                        item_value = (
                            item
                            if isinstance(item, str)
                            else (
                                item.get("item")
                                or item.get("id")
                                or item.get("text")
                                or str(item)
                            )
                        )
                        answer_key = f"reading_p{passage_id}_q{qid}_{item_value}"
                        if answers.get(answer_key, "").strip():
                            has_any_answer = True
                            break
                    if has_any_answer:
                        break
                else:
                    if answers.get(f"reading_p{passage_id}_q{qid}", "").strip():
                        has_any_answer = True
                        break
            if has_any_answer:
                break

        if not has_any_answer:
            band = 0.0
        elif raw_score == 0:
            band = 0.0
        else:
            band = self.READING_BANDS.get(raw_score, 0.0)

        # Analyze question types performance
        question_type_analysis = self._analyze_question_types(detailed_results)

        return {
            "raw_score": raw_score,
            "total_questions": total_questions,
            "band": round(band, 1),
            "detailed_results": detailed_results,
            "question_type_analysis": question_type_analysis,
        }

    def _analyze_question_types(self, detailed_results: list) -> Dict[str, Any]:
        """Analyze performance by question type"""
        type_stats = {}
        for result in detailed_results:
            q_type = result.get("question_type", "unknown")
            if q_type not in type_stats:
                type_stats[q_type] = {"correct": 0, "total": 0}
            type_stats[q_type]["total"] += 1
            if result.get("is_correct"):
                type_stats[q_type]["correct"] += 1

        analysis = {}
        for q_type, stats in type_stats.items():
            accuracy = (
                (stats["correct"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            )
            analysis[q_type] = {
                "correct": stats["correct"],
                "total": stats["total"],
                "accuracy": round(accuracy, 1),
                "performance": (
                    "strong"
                    if accuracy >= 70
                    else "moderate" if accuracy >= 50 else "weak"
                ),
            }

        return analysis

    def score_speaking(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Score Speaking section using AI (4 criteria + extended analysis)"""
        part1_questions = content.get("speaking", {}).get("part1", [])
        part2 = content.get("speaking", {}).get("part2", {})
        part3_questions = content.get("speaking", {}).get("part3", [])

        all_answer_keys = []
        for q in part1_questions:
            all_answer_keys.append(f"speaking_part1_{q.get('id')}")
        if part2:
            all_answer_keys.append("speaking_part2")
        for q in part3_questions:
            all_answer_keys.append(f"speaking_part3_{q.get('id')}")

        has_any_answer = any(answers.get(key, "").strip() for key in all_answer_keys)

        if not has_any_answer:
            return {
                "fluency_coherence": 0.0,
                "lexical_resource": 0.0,
                "grammatical_range": 0.0,
                "pronunciation": 0.0,
                "overall_band": 0.0,
                "feedback": "No answers provided",
                "extended_analysis": {},
            }

        system_instruction = """You are an IELTS examiner. Evaluate speaking using 4 criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation. Return JSON only."""

        def truncate_text(text: str, max_words: int = 100) -> str:
            if not text:
                return ""
            words = text.split()
            if len(words) <= max_words:
                return text
            return " ".join(words[:max_words]) + "..."

        part1_answers_dict = {}
        for q in part1_questions:
            qid = q.get("id")
            answer_key = f"speaking_part1_{qid}"
            if answer_key in answers:
                part1_answers_dict[qid] = answers[answer_key]

        speaking_part2_answer = truncate_text(
            answers.get("speaking_part2", ""), max_words=200
        )

        part3_answers_dict = {}
        for q in part3_questions:
            qid = q.get("id")
            answer_key = f"speaking_part3_{qid}"
            if answer_key in answers:
                part3_answers_dict[qid] = answers[answer_key]

        part1_items = []
        for q in part1_questions[:4]:
            qid = q.get("id")
            q_text = q.get("question", "")[:100]
            a_text = truncate_text(part1_answers_dict.get(qid, ""), 50)
            part1_items.append(f"Q{qid}: {q_text}\nA: {a_text}")
        part1_text = "\n".join(part1_items)

        part3_items = []
        for q in part3_questions[:4]:
            qid = q.get("id")
            q_text = q.get("question", "")[:100]
            a_text = truncate_text(part3_answers_dict.get(qid, ""), 80)
            part3_items.append(f"Q{qid}: {q_text}\nA: {a_text}")
        part3_text = "\n".join(part3_items)

        task_card = part2.get("task_card", "")[:200]
        topic = part2.get("topic", "")
        prompt = f"""Evaluate IELTS Speaking:

Part 1 (3-4 intro questions):
{part1_text}

Part 2 (Cue card - topic: {topic}):
{task_card}
Answer: {speaking_part2_answer}

Part 3 (3-4 analytical questions):
{part3_text}

Evaluate using IELTS criteria (0-9.0 bands). Return JSON only:
{{"fluency_coherence":7.0,"lexical_resource":7.0,"grammatical_range":7.0,"pronunciation":7.0,"overall_band":7.0,"feedback":"Brief feedback"}}"""

        try:
            print("Calling Gemini API for Speaking scoring...")
            result = self.gemini.generate_json(prompt, system_instruction)
            print("Gemini API response received for Speaking")

            # Generate extended analysis
            extended_analysis = self._generate_speaking_extended_analysis(
                part1_answers_dict, speaking_part2_answer, part3_answers_dict, result
            )

            return {
                "fluency_coherence": result.get("fluency_coherence", 5.0),
                "lexical_resource": result.get("lexical_resource", 5.0),
                "grammatical_range": result.get("grammatical_range", 5.0),
                "pronunciation": result.get("pronunciation", 5.0),
                "overall_band": result.get("overall_band", 5.0),
                "feedback": result.get("feedback", ""),
                "extended_analysis": extended_analysis,
            }
        except Exception as e:
            print(f"Speaking scoring error: {e}")
            import traceback

            print(traceback.format_exc())
            return {
                "fluency_coherence": 5.0,
                "lexical_resource": 5.0,
                "grammatical_range": 5.0,
                "pronunciation": 5.0,
                "overall_band": 5.0,
                "feedback": "Unable to evaluate automatically",
                "extended_analysis": {},
            }

    def score_writing(
        self, content: Dict[str, Any], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Score Writing section using AI (4 criteria + extended analysis)"""
        has_task1 = bool(content.get("writing", {}).get("task1"))
        task1_answer = answers.get("writing_task1", "").strip() if has_task1 else ""
        task2_answer = answers.get("writing_task2", "").strip()

        has_any_answer = bool(task2_answer or (has_task1 and task1_answer))

        if not has_any_answer:
            result = {
                "task2": {
                    "task_response": 0.0,
                    "coherence_cohesion": 0.0,
                    "lexical_resource": 0.0,
                    "grammatical_range": 0.0,
                    "overall_band": 0.0,
                },
                "overall_band": 0.0,
                "feedback": "No answers provided",
                "extended_analysis": {},
            }
            if has_task1:
                result["task1"] = {
                    "task_achievement": 0.0,
                    "coherence_cohesion": 0.0,
                    "lexical_resource": 0.0,
                    "grammatical_range": 0.0,
                    "overall_band": 0.0,
                }
            return result

        system_instruction = """You are an IELTS examiner. Evaluate writing using 4 criteria: Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Return JSON only."""

        def truncate_text(text: str, max_words: int = 150) -> str:
            if not text:
                return ""
            words = text.split()
            if len(words) <= max_words:
                return text
            return " ".join(words[:max_words]) + "..."

        task2_answer = truncate_text(task2_answer, max_words=120)

        if has_task1 and task1_answer:
            task1_answer = truncate_text(task1_answer, max_words=100)
            task1_instructions = (
                content.get("writing", {}).get("task1", {}).get("instructions", "")
            )
        else:
            task1_instructions = ""
            task1_answer = ""

        task2_question = content.get("writing", {}).get("task2", {}).get("question", "")
        task1_word_limit = (
            content.get("writing", {}).get("task1", {}).get("word_limit", 80)
            if has_task1
            else 80
        )
        task2_word_limit = (
            content.get("writing", {}).get("task2", {}).get("word_limit", 120)
        )

        if has_task1 and task1_answer:
            prompt = f"""Evaluate IELTS Writing:

Task 1 (Chart/Graph description - target: {task1_word_limit} words):
Instructions: {task1_instructions}
Answer: {task1_answer}

Task 2 (Essay - target: {task2_word_limit} words):
Question: {task2_question}
Answer: {task2_answer}

Evaluate using IELTS criteria (0-9.0 bands). Consider word count targets: Task 1 ({task1_word_limit} words), Task 2 ({task2_word_limit} words).
Return JSON only:
{{"task1":{{"task_achievement":7.0,"coherence_cohesion":7.0,"lexical_resource":7.0,"grammatical_range":7.0,"overall_band":7.0}},"task2":{{"task_response":7.0,"coherence_cohesion":7.0,"lexical_resource":7.0,"grammatical_range":7.0,"overall_band":7.0}},"overall_band":7.0,"feedback":"Brief feedback"}}"""
        else:
            prompt = f"""Evaluate IELTS Writing Task 2 (Essay - target: {task2_word_limit} words):

Question: {task2_question}
Answer: {task2_answer}

Evaluate using IELTS criteria (0-9.0 bands). Consider word count target: {task2_word_limit} words.
Return JSON only:
{{"task2":{{"task_response":7.0,"coherence_cohesion":7.0,"lexical_resource":7.0,"grammatical_range":7.0,"overall_band":7.0}},"overall_band":7.0,"feedback":"Brief feedback"}}"""

        try:
            print("Calling Gemini API for Writing scoring...")
            result = self.gemini.generate_json(prompt, system_instruction)
            print("Gemini API response received for Writing")

            task2_scores = result.get("task2", {})

            writing_result = {
                "task2": {
                    "task_response": task2_scores.get("task_response", 5.0),
                    "coherence_cohesion": task2_scores.get("coherence_cohesion", 5.0),
                    "lexical_resource": task2_scores.get("lexical_resource", 5.0),
                    "grammatical_range": task2_scores.get("grammatical_range", 5.0),
                    "overall_band": task2_scores.get("overall_band", 5.0),
                },
                "overall_band": result.get(
                    "overall_band", task2_scores.get("overall_band", 5.0)
                ),
                "feedback": result.get("feedback", ""),
            }

            if has_task1:
                task1_scores = result.get("task1", {})
                writing_result["task1"] = {
                    "task_achievement": task1_scores.get("task_achievement", 5.0),
                    "coherence_cohesion": task1_scores.get("coherence_cohesion", 5.0),
                    "lexical_resource": task1_scores.get("lexical_resource", 5.0),
                    "grammatical_range": task1_scores.get("grammatical_range", 5.0),
                    "overall_band": task1_scores.get("overall_band", 5.0),
                }
                if task1_scores.get("overall_band") and task2_scores.get(
                    "overall_band"
                ):
                    writing_result["overall_band"] = round(
                        (
                            task1_scores.get("overall_band", 0)
                            + task2_scores.get("overall_band", 0)
                        )
                        / 2.0,
                        1,
                    )

            # Generate extended analysis
            extended_analysis = self._generate_writing_extended_analysis(
                task1_answer if has_task1 else "", task2_answer, writing_result
            )
            writing_result["extended_analysis"] = extended_analysis

            return writing_result
        except Exception as e:
            print(f"Writing scoring error: {e}")
            import traceback

            print(traceback.format_exc())
            fallback_result = {
                "task2": {
                    "task_response": 5.0,
                    "coherence_cohesion": 5.0,
                    "lexical_resource": 5.0,
                    "grammatical_range": 5.0,
                    "overall_band": 5.0,
                },
                "overall_band": 5.0,
                "feedback": "Unable to evaluate automatically",
                "extended_analysis": {},
            }
            if has_task1:
                fallback_result["task1"] = {
                    "task_achievement": 5.0,
                    "coherence_cohesion": 5.0,
                    "lexical_resource": 5.0,
                    "grammatical_range": 5.0,
                    "overall_band": 5.0,
                }
            return fallback_result

    def _generate_speaking_extended_analysis(
        self, part1_answers: Dict, part2_answer: str, part3_answers: Dict, scores: Dict
    ) -> Dict[str, Any]:
        """Generate extended analysis for Speaking"""
        system_instruction = """Bạn là giám khảo IELTS. Phân tích hiệu suất nói vượt ra ngoài tiêu chí IELTS. Trả về JSON chỉ bằng tiếng Việt."""

        all_answers = []
        for qid, answer in part1_answers.items():
            all_answers.append(f"Part 1 Q{qid}: {answer[:100]}")
        if part2_answer:
            all_answers.append(f"Part 2: {part2_answer[:200]}")
        for qid, answer in part3_answers.items():
            all_answers.append(f"Part 3 Q{qid}: {answer[:150]}")

        answers_text = "\n".join(all_answers)

        prompt = f"""Phân tích hiệu suất nói vượt ra ngoài tiêu chí IELTS:

Điểm số: FC={scores.get('fluency_coherence', 0):.1f}, LR={scores.get('lexical_resource', 0):.1f}, GR={scores.get('grammatical_range', 0):.1f}, P={scores.get('pronunciation', 0):.1f}

Câu trả lời:
{answers_text}

Phân tích:
1. Mức độ phản xạ: Người nói phản ứng nhanh và tự nhiên như thế nào
2. Khả năng tiếp nhận: Khả năng hiểu và xử lý câu hỏi
3. Ảnh hưởng tiếng mẹ đẻ: Tác động của ngôn ngữ mẹ đẻ trong dịch thuật, sử dụng từ vựng, nghe hiểu, đọc hiểu, nói, viết
4. Ngữ pháp: Lỗi nghĩa cơ bản, lỗi ngữ pháp, lỗi cấu trúc, cách diễn đạt không tự nhiên
5. Phát âm: Rõ ràng, mạch lạc, hiểu tiếng Anh bản ngữ, nhịp điệu, trọng âm, phát âm từ, nguyên âm đôi, kết thúc
6. Từ vựng: Mức độ cơ bản hay nâng cao, sử dụng tự nhiên hay dịch máy, trình độ từ vựng

Trả về JSON chỉ bằng tiếng Việt:
{{"reflex_level":"","reception_ability":"","mother_tongue_influence":"","grammar_analysis":"","pronunciation_analysis":"","vocabulary_analysis":"","overall_assessment":""}}"""

        try:
            result = self.gemini.generate_json(prompt, system_instruction, force_key=2)
            return result
        except Exception as e:
            print(f"Error generating speaking extended analysis: {e}")
            return {}

    def _generate_writing_extended_analysis(
        self, task1_answer: str, task2_answer: str, scores: Dict
    ) -> Dict[str, Any]:
        """Generate extended analysis for Writing"""
        system_instruction = """Bạn là giám khảo IELTS. Phân tích hiệu suất viết vượt ra ngoài tiêu chí IELTS. Trả về JSON chỉ bằng tiếng Việt."""

        prompt = f"""Phân tích hiệu suất viết vượt ra ngoài tiêu chí IELTS:

Điểm số: Tổng thể={scores.get('overall_band', 0):.1f}

Task 1: {task1_answer[:150] if task1_answer else 'N/A'}
Task 2: {task2_answer[:200]}

Phân tích:
1. Mức độ phản xạ: Ý tưởng được diễn đạt nhanh và tự nhiên như thế nào
2. Khả năng tiếp nhận: Khả năng hiểu và xử lý các nhiệm vụ viết
3. Ảnh hưởng tiếng mẹ đẻ: Tác động của ngôn ngữ mẹ đẻ trong dịch thuật, sử dụng từ vựng, đọc hiểu, cấu trúc viết
4. Ngữ pháp: Lỗi nghĩa cơ bản, lỗi ngữ pháp, lỗi cấu trúc, cách diễn đạt không tự nhiên, mẫu câu
5. Từ vựng: Mức độ cơ bản hay nâng cao, sử dụng tự nhiên hay dịch máy, phạm vi từ vựng, tính phù hợp của lựa chọn từ
6. Chất lượng cấu trúc: Tổ chức, mạch lạc, phát triển đoạn văn, dòng logic

Trả về JSON chỉ bằng tiếng Việt:
{{"reflex_level":"","reception_ability":"","mother_tongue_influence":"","grammar_analysis":"","vocabulary_analysis":"","structure_quality":"","overall_assessment":""}}"""

        try:
            result = self.gemini.generate_json(prompt, system_instruction, force_key=2)
            return result
        except Exception as e:
            print(f"Error generating writing extended analysis: {e}")
            return {}

    def analyze_listening_reading_question_types(
        self,
        content: Dict[str, Any],
        answers: Dict[str, Any],
        scores: Dict[str, Any],
        skill: str,
    ) -> Dict[str, Any]:
        """Use AI to analyze question types performance for Listening/Reading"""
        system_instruction = """Bạn là giám khảo IELTS. Phân tích hiệu suất theo loại câu hỏi. Trả về JSON chỉ bằng tiếng Việt."""

        detailed_results = scores.get("detailed_results", [])
        question_type_analysis = scores.get("question_type_analysis", {})

        # Prepare data for analysis
        type_performance = []
        for q_type, stats in question_type_analysis.items():
            type_performance.append(
                f"{q_type}: {stats['correct']}/{stats['total']} correct ({stats['accuracy']}% accuracy)"
            )

        skill_name = "Nghe" if skill == "listening" else "Đọc"
        prompt = f"""Phân tích hiệu suất {skill_name} theo loại câu hỏi:

Hiệu suất theo loại câu hỏi:
{chr(10).join(type_performance)}

Điểm tổng thể: {scores.get('raw_score', 0)}/{scores.get('total_questions', 0)} = Band {scores.get('band', 0):.1f}

Phân tích:
1. Điểm mạnh: Loại câu hỏi nào thí sinh làm tốt
2. Điểm yếu: Loại câu hỏi nào cần cải thiện
3. Phân tích chi tiết cho từng loại câu hỏi: Tại sao họ thành công hoặc thất bại
4. Khuyến nghị: Làm thế nào để cải thiện hiệu suất ở các loại câu hỏi yếu

Trả về JSON chỉ bằng tiếng Việt:
{{"strengths":[],"weaknesses":[],"detailed_analysis":{{}},"recommendations":[]}}"""

        try:
            result = self.gemini.generate_json(prompt, system_instruction, force_key=1)
            return result
        except Exception as e:
            print(f"Error analyzing {skill} question types: {e}")
            return {
                "strengths": [],
                "weaknesses": [],
                "detailed_analysis": {},
                "recommendations": [],
            }

    def aggregate_results(
        self,
        phase1_scores: Dict[str, Any],
        phase2_scores: Dict[str, Any],
        phase1_type: Phase,
        phase2_type: Phase,
    ) -> Dict[str, Any]:
        """Aggregate final IELTS results from both phases"""
        results = {
            "listening": 0.0,
            "reading": 0.0,
            "writing": 0.0,
            "speaking": 0.0,
        }

        if phase1_type == Phase.LISTENING_SPEAKING:
            results["listening"] = phase1_scores.get("listening", {}).get("band", 0.0)
            results["speaking"] = phase1_scores.get("speaking", {}).get(
                "overall_band", 0.0
            )
        elif phase1_type == Phase.READING_WRITING:
            results["reading"] = phase1_scores.get("reading", {}).get("band", 0.0)
            results["writing"] = phase1_scores.get("writing", {}).get(
                "overall_band", 0.0
            )

        if phase2_type == Phase.LISTENING_SPEAKING:
            results["listening"] = phase2_scores.get("listening", {}).get("band", 0.0)
            results["speaking"] = phase2_scores.get("speaking", {}).get(
                "overall_band", 0.0
            )
        elif phase2_type == Phase.READING_WRITING:
            results["reading"] = phase2_scores.get("reading", {}).get("band", 0.0)
            results["writing"] = phase2_scores.get("writing", {}).get(
                "overall_band", 0.0
            )

        overall = round(
            (
                results["listening"]
                + results["reading"]
                + results["writing"]
                + results["speaking"]
            )
            / 4.0,
            1,
        )

        results["overall"] = overall
        return results

    def generate_detailed_analysis(
        self,
        phase1_scores: Dict[str, Any],
        phase2_scores: Dict[str, Any],
        phase1_type: Phase,
        phase2_type: Phase,
        phase1_content: Dict[str, Any],
        phase2_content: Dict[str, Any],
        phase1_answers: Dict[str, Any],
        phase2_answers: Dict[str, Any],
        final_results: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate detailed analysis including IELTS framework and extended insights"""
        system_instruction = """Bạn là giám khảo IELTS. Phân tích toàn diện hiệu suất tiếng Anh. Trả về JSON chỉ bằng tiếng Việt."""

        listening_score = final_results.get("listening", 0)
        reading_score = final_results.get("reading", 0)
        writing_score = final_results.get("writing", 0)
        speaking_score = final_results.get("speaking", 0)
        overall_score = final_results.get("overall", 0)

        # Collect scores summaries
        listening_summary = ""
        if phase1_type == Phase.LISTENING_SPEAKING and phase1_scores.get("listening"):
            l1 = phase1_scores["listening"]
            listening_summary += f"P1:{l1.get('raw_score', 0)}/{l1.get('total_questions', 0)}={l1.get('band', 0):.1f} "
        if phase2_type == Phase.LISTENING_SPEAKING and phase2_scores.get("listening"):
            l2 = phase2_scores["listening"]
            listening_summary += f"P2:{l2.get('raw_score', 0)}/{l2.get('total_questions', 0)}={l2.get('band', 0):.1f}"

        reading_summary = ""
        if phase1_type == Phase.READING_WRITING and phase1_scores.get("reading"):
            r1 = phase1_scores["reading"]
            reading_summary += f"P1:{r1.get('raw_score', 0)}/{r1.get('total_questions', 0)}={r1.get('band', 0):.1f} "
        if phase2_type == Phase.READING_WRITING and phase2_scores.get("reading"):
            r2 = phase2_scores["reading"]
            reading_summary += f"P2:{r2.get('raw_score', 0)}/{r2.get('total_questions', 0)}={r2.get('band', 0):.1f}"

        # Get question type analysis for Listening/Reading
        listening_analysis = {}
        if phase1_type == Phase.LISTENING_SPEAKING and phase1_scores.get("listening"):
            listening_analysis = self.analyze_listening_reading_question_types(
                phase1_content, phase1_answers, phase1_scores["listening"], "listening"
            )
        elif phase2_type == Phase.LISTENING_SPEAKING and phase2_scores.get("listening"):
            listening_analysis = self.analyze_listening_reading_question_types(
                phase2_content, phase2_answers, phase2_scores["listening"], "listening"
            )

        reading_analysis = {}
        if phase1_type == Phase.READING_WRITING and phase1_scores.get("reading"):
            reading_analysis = self.analyze_listening_reading_question_types(
                phase1_content, phase1_answers, phase1_scores["reading"], "reading"
            )
        elif phase2_type == Phase.READING_WRITING and phase2_scores.get("reading"):
            reading_analysis = self.analyze_listening_reading_question_types(
                phase2_content, phase2_answers, phase2_scores["reading"], "reading"
            )

        # Get extended analysis from Speaking/Writing scores
        speaking_extended = {}
        if phase1_type == Phase.LISTENING_SPEAKING and phase1_scores.get("speaking"):
            speaking_extended = phase1_scores["speaking"].get("extended_analysis", {})
        elif phase2_type == Phase.LISTENING_SPEAKING and phase2_scores.get("speaking"):
            speaking_extended = phase2_scores["speaking"].get("extended_analysis", {})

        writing_extended = {}
        if phase1_type == Phase.READING_WRITING and phase1_scores.get("writing"):
            writing_extended = phase1_scores["writing"].get("extended_analysis", {})
        elif phase2_type == Phase.READING_WRITING and phase2_scores.get("writing"):
            writing_extended = phase2_scores["writing"].get("extended_analysis", {})

        # Build comprehensive analysis
        # Extract Writing criteria from phase scores
        writing_criteria = {}
        if phase1_type == Phase.READING_WRITING and phase1_scores.get("writing"):
            writing_scores = phase1_scores["writing"]
            if writing_scores.get("task1"):
                task1 = writing_scores["task1"]
                writing_criteria["task_achievement"] = {
                    "score": task1.get("task_achievement", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["coherence_cohesion"] = {
                    "score": task1.get("coherence_cohesion", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["lexical_resource"] = {
                    "score": task1.get("lexical_resource", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["grammatical_range"] = {
                    "score": task1.get("grammatical_range", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
            if writing_scores.get("task2"):
                task2 = writing_scores["task2"]
                if not writing_criteria.get("coherence_cohesion"):
                    writing_criteria["coherence_cohesion"] = {
                        "score": task2.get("coherence_cohesion", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }
                if not writing_criteria.get("lexical_resource"):
                    writing_criteria["lexical_resource"] = {
                        "score": task2.get("lexical_resource", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }
                if not writing_criteria.get("grammatical_range"):
                    writing_criteria["grammatical_range"] = {
                        "score": task2.get("grammatical_range", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }
        elif phase2_type == Phase.READING_WRITING and phase2_scores.get("writing"):
            writing_scores = phase2_scores["writing"]
            if writing_scores.get("task1"):
                task1 = writing_scores["task1"]
                writing_criteria["task_achievement"] = {
                    "score": task1.get("task_achievement", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["coherence_cohesion"] = {
                    "score": task1.get("coherence_cohesion", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["lexical_resource"] = {
                    "score": task1.get("lexical_resource", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
                writing_criteria["grammatical_range"] = {
                    "score": task1.get("grammatical_range", 0.0),
                    "strengths": [],
                    "weaknesses": [],
                }
            if writing_scores.get("task2"):
                task2 = writing_scores["task2"]
                if not writing_criteria.get("coherence_cohesion"):
                    writing_criteria["coherence_cohesion"] = {
                        "score": task2.get("coherence_cohesion", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }
                if not writing_criteria.get("lexical_resource"):
                    writing_criteria["lexical_resource"] = {
                        "score": task2.get("lexical_resource", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }
                if not writing_criteria.get("grammatical_range"):
                    writing_criteria["grammatical_range"] = {
                        "score": task2.get("grammatical_range", 0.0),
                        "strengths": [],
                        "weaknesses": [],
                    }

        # Extract Speaking criteria from phase scores
        speaking_criteria = {}
        if phase1_type == Phase.LISTENING_SPEAKING and phase1_scores.get("speaking"):
            speaking_scores = phase1_scores["speaking"]
            speaking_criteria["fluency_coherence"] = {
                "score": speaking_scores.get("fluency_coherence", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["lexical_resource"] = {
                "score": speaking_scores.get("lexical_resource", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["grammatical_range"] = {
                "score": speaking_scores.get("grammatical_range", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["pronunciation"] = {
                "score": speaking_scores.get("pronunciation", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
        elif phase2_type == Phase.LISTENING_SPEAKING and phase2_scores.get("speaking"):
            speaking_scores = phase2_scores["speaking"]
            speaking_criteria["fluency_coherence"] = {
                "score": speaking_scores.get("fluency_coherence", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["lexical_resource"] = {
                "score": speaking_scores.get("lexical_resource", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["grammatical_range"] = {
                "score": speaking_scores.get("grammatical_range", 0.0),
                "strengths": [],
                "weaknesses": [],
            }
            speaking_criteria["pronunciation"] = {
                "score": speaking_scores.get("pronunciation", 0.0),
                "strengths": [],
                "weaknesses": [],
            }

        ielts_analysis = {
            "listening": {
                "band": listening_score,
                "question_type_analysis": listening_analysis,
            },
            "reading": {
                "band": reading_score,
                "question_type_analysis": reading_analysis,
            },
            "writing": {
                "band": writing_score,
                "criteria_analysis": writing_criteria,
            },
            "speaking": {
                "band": speaking_score,
                "criteria_analysis": speaking_criteria,
            },
        }

        extended_analysis = {
            "listening": listening_analysis.get("detailed_analysis", {}),
            "reading": reading_analysis.get("detailed_analysis", {}),
            "writing": writing_extended,
            "speaking": speaking_extended,
            "overall": {
                "reflex_level": "",
                "reception_ability": "",
                "mother_tongue_influence": "",
                "key_strengths": "",
                "key_weaknesses": "",
            },
        }

        # Generate overall extended analysis
        overall_prompt = f"""Phân tích tổng thể hiệu suất tiếng Anh:

Điểm số: Nghe={listening_score:.1f} Đọc={reading_score:.1f} Viết={writing_score:.1f} Nói={speaking_score:.1f} Tổng={overall_score:.1f}

Phân tích mở rộng có sẵn:
- Nghe: {listening_analysis.get('strengths', [])}
- Đọc: {reading_analysis.get('strengths', [])}
- Viết: {writing_extended.get('grammar_analysis', '')[:100]}
- Nói: {speaking_extended.get('pronunciation_analysis', '')[:100]}

Phân tích tổng thể:
1. Mức độ phản xạ: Khả năng tổng thể phản ứng nhanh và tự nhiên
2. Khả năng tiếp nhận: Khả năng tổng thể hiểu và xử lý tiếng Anh
3. Ảnh hưởng tiếng mẹ đẻ: Tác động tổng thể trên tất cả các kỹ năng
4. Điểm mạnh chính: Các lĩnh vực mạnh chính
5. Điểm yếu chính: Các lĩnh vực cần cải thiện chính

Trả về JSON chỉ bằng tiếng Việt:
{{"reflex_level":"","reception_ability":"","mother_tongue_influence":"","key_strengths":"","key_weaknesses":""}}"""

        try:
            overall_result = self.gemini.generate_json(
                overall_prompt, system_instruction, force_key=2
            )
            extended_analysis["overall"] = overall_result
        except Exception as e:
            print(f"Error generating overall extended analysis: {e}")

        return {
            "ielts_analysis": ielts_analysis,
            "extended_analysis": extended_analysis,
        }
