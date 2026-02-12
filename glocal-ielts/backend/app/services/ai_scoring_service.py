from typing import Any, Dict, List
from .gemini_service import GeminiService


class AIScoringService:
    """
    AI-powered scoring service for Speaking and Writing using Gemini.
    Provides detailed, rubric-based assessment similar to real IELTS examiners.
    """

    def __init__(self) -> None:
        self.gemini = GeminiService()

    def score_speaking_with_ai(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use Gemini AI to score Speaking responses based on IELTS criteria:
        - Fluency & Coherence
        - Lexical Resource
        - Grammatical Range & Accuracy
        - Pronunciation (estimated from transcript quality)
        """
        # Collect all speaking responses
        part1_responses = []
        part2_response = ""
        part3_responses = []

        for key, val in answers.items():
            if not key.startswith("speaking_") or not isinstance(val, str):
                continue
            
            text = val.strip()
            if not text:
                continue

            if "part1" in key:
                part1_responses.append(text)
            elif "part2" in key:
                part2_response = text
            elif "part3" in key:
                part3_responses.append(text)

        # If no responses, return zero scores
        if not (part1_responses or part2_response or part3_responses):
            return {
                "fluency_coherence": 0.0,
                "lexical_resource": 0.0,
                "grammatical_range": 0.0,
                "pronunciation": 0.0,
                "overall_band": 0.0,
                "feedback": "No speaking responses provided.",
                "extended_analysis": {},
            }

        system_instruction = """You are an expert IELTS Speaking examiner.
Assess the candidate's speaking performance based on official IELTS criteria.
Return detailed scores and analysis in JSON format only."""

        prompt = f"""
Evaluate this IELTS Speaking test performance:

**PART 1 - Introduction & Interview:**
{chr(10).join([f"Response {i+1}: {resp}" for i, resp in enumerate(part1_responses)]) if part1_responses else "(No responses)"}

**PART 2 - Long Turn (Cue Card):**
{part2_response if part2_response else "(No response)"}

**PART 3 - Discussion:**
{chr(10).join([f"Response {i+1}: {resp}" for i, resp in enumerate(part3_responses)]) if part3_responses else "(No responses)"}

**ASSESSMENT REQUIREMENTS:**

Evaluate based on 4 IELTS Speaking criteria and provide scores from 0.0 to 9.0 (in 0.5 increments):

1. **Fluency & Coherence (0.0-9.0)**
   - Speech continuity and flow
   - Logical sequencing of ideas
   - Use of cohesive devices
   - Self-correction and hesitation

2. **Lexical Resource (0.0-9.0)**
   - Vocabulary range and flexibility
   - Precise word choice
   - Ability to paraphrase
   - Use of less common vocabulary

3. **Grammatical Range & Accuracy (0.0-9.0)**
   - Sentence structure variety (simple, compound, complex)
   - Grammatical accuracy
   - Appropriate tense usage
   - Error frequency and impact

4. **Pronunciation (0.0-9.0)**
   - Estimated from transcript quality
   - Sentence stress and rhythm (inferred)
   - Natural flow indicators
   - Word-level stress patterns

**OUTPUT JSON STRUCTURE (MUST be valid JSON, NO markdown):**

{{
  "fluency_coherence": 6.5,
  "lexical_resource": 6.0,
  "grammatical_range": 6.0,
  "pronunciation": 6.5,
  "overall_band": 6.0,
  "feedback": "Tóm tắt đánh giá tổng thể (80-100 từ tiếng Việt)",
  "extended_analysis": {{
    "reflex_level": "Đánh giá mức độ phản xạ và tốc độ trả lời",
    "reception_ability": "Khả năng hiểu và phản hồi câu hỏi",
    "mother_tongue_influence": "Ảnh hưởng tiếng mẹ đẻ trong cách diễn đạt",
    "grammar_analysis": "Phân tích chi tiết lỗi ngữ pháp và cách cải thiện",
    "pronunciation_analysis": "Đánh giá phát âm dựa trên transcript",
    "vocabulary_analysis": "Phân tích phạm vi và độ chính xác từ vựng",
    "overall_assessment": "Đánh giá tổng thể và gợi ý cải thiện"
  }},
  "part_scores": {{
    "part1": {{
      "performance": "Đánh giá Part 1",
      "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
      "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"]
    }},
    "part2": {{
      "performance": "Đánh giá Part 2",
      "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
      "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"]
    }},
    "part3": {{
      "performance": "Đánh giá Part 3",
      "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
      "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"]
    }}
  }}
}}

**CRITICAL RULES:**
1. Scores MUST be realistic (0.0-9.0 in 0.5 increments)
2. Overall band = average of 4 criteria, rounded to nearest 0.5
3. Be specific about errors and strengths
4. Analysis in Vietnamese for better understanding
5. Output MUST be valid JSON only
"""

        try:
            result = self.gemini.generate_json(prompt, system_instruction, force_key=2)
            
            # Validate and fix scores
            for key in ["fluency_coherence", "lexical_resource", "grammatical_range", "pronunciation"]:
                if key in result:
                    result[key] = max(0.0, min(9.0, round(result[key] * 2) / 2))
            
            # Calculate overall band
            if all(key in result for key in ["fluency_coherence", "lexical_resource", "grammatical_range", "pronunciation"]):
                avg = (result["fluency_coherence"] + result["lexical_resource"] + 
                       result["grammatical_range"] + result["pronunciation"]) / 4
                result["overall_band"] = round(avg * 2) / 2
            
            return result

        except Exception as e:
            print(f"Error in AI Speaking scoring: {e}")
            # Fallback to basic scoring
            return self._fallback_speaking_score(answers)

    def score_writing_with_ai(self, answers: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use Gemini AI to score Writing responses based on IELTS criteria:
        Task 1: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range
        Task 2: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range
        """
        task1_text = answers.get("writing_task1", "").strip()
        task2_text = answers.get("writing_task2", "").strip()

        if not task2_text:
            return {
                "task2": {
                    "task_response": 0.0,
                    "coherence_cohesion": 0.0,
                    "lexical_resource": 0.0,
                    "grammatical_range": 0.0,
                    "overall_band": 0.0,
                },
                "overall_band": 0.0,
                "feedback": "No Task 2 essay provided.",
                "extended_analysis": {},
            }

        # Get task prompts from content
        writing_content = content.get("writing", {})
        task1_prompt = writing_content.get("task1", {}).get("instructions", "")
        task2_prompt = writing_content.get("task2", {}).get("question", "")

        system_instruction = """You are an expert IELTS Writing examiner.
Assess the candidate's writing based on official IELTS criteria.
Return detailed scores and analysis in JSON format only."""

        prompt = f"""
Evaluate this IELTS Writing test performance:

**TASK 1 - Visual Description (Target: 50-80 words):**
Prompt: {task1_prompt}

Student's Response ({len(task1_text.split())} words):
{task1_text if task1_text else "(No response)"}

**TASK 2 - Essay (Target: 100-120 words):**
Prompt: {task2_prompt}

Student's Response ({len(task2_text.split())} words):
{task2_text}

**ASSESSMENT REQUIREMENTS:**

Evaluate based on IELTS Writing criteria (scores 0.0-9.0 in 0.5 increments):

**TASK 1 Criteria (if provided):**
1. Task Achievement: Fulfills requirements, presents overview, highlights key features
2. Coherence & Cohesion: Organization, paragraphing, linking devices
3. Lexical Resource: Vocabulary range, accuracy, spelling
4. Grammatical Range & Accuracy: Sentence variety, accuracy, punctuation

**TASK 2 Criteria (REQUIRED):**
1. Task Response: Addresses all parts, position clear, develops ideas fully
2. Coherence & Cohesion: Organization, paragraphing, progression
3. Lexical Resource: Vocabulary range, precision, collocation
4. Grammatical Range & Accuracy: Complex structures, accuracy

**OUTPUT JSON STRUCTURE (MUST be valid JSON, NO markdown):**

{{
  "task1": {{
    "task_achievement": 6.0,
    "coherence_cohesion": 6.0,
    "lexical_resource": 6.0,
    "grammatical_range": 6.0,
    "overall_band": 6.0,
    "word_count": {len(task1_text.split())},
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
    "specific_errors": ["Lỗi cụ thể 1", "Lỗi cụ thể 2"]
  }},
  "task2": {{
    "task_response": 6.5,
    "coherence_cohesion": 6.0,
    "lexical_resource": 6.0,
    "grammatical_range": 6.0,
    "overall_band": 6.0,
    "word_count": {len(task2_text.split())},
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
    "specific_errors": ["Lỗi cụ thể 1", "Lỗi cụ thể 2"]
  }},
  "overall_band": 6.0,
  "feedback": "Tóm tắt đánh giá tổng thể (100-150 từ tiếng Việt)",
  "extended_analysis": {{
    "reflex_level": "Đánh giá tốc độ và chất lượng viết",
    "reception_ability": "Khả năng hiểu và phản hồi đề bài",
    "mother_tongue_influence": "Ảnh hưởng tiếng mẹ đẻ trong cấu trúc câu",
    "grammar_analysis": "Phân tích chi tiết lỗi ngữ pháp (thì, mạo từ, giới từ, v.v.)",
    "vocabulary_analysis": "Phân tích từ vựng: phạm vi, chính xác, collocation",
    "structure_quality": "Đánh giá cấu trúc bài: mở bài, thân bài, kết luận",
    "overall_assessment": "Đánh giá tổng thể và lộ trình cải thiện cụ thể"
  }}
}}

**CRITICAL RULES:**
1. All scores MUST be 0.0-9.0 in 0.5 increments
2. Task 2 weight = 2/3, Task 1 weight = 1/3 for overall band
3. Deduct points for under/over word count
4. Be SPECIFIC about grammar errors (list actual errors)
5. Identify exact vocabulary issues
6. Analysis in Vietnamese
7. Output MUST be valid JSON only
"""

        try:
            result = self.gemini.generate_json(prompt, system_instruction, force_key=2)
            
            # Validate and fix scores
            if "task1" in result and task1_text:
                for key in ["task_achievement", "coherence_cohesion", "lexical_resource", "grammatical_range"]:
                    if key in result["task1"]:
                        result["task1"][key] = max(0.0, min(9.0, round(result["task1"][key] * 2) / 2))
                
                # Calculate task1 overall
                if all(key in result["task1"] for key in ["task_achievement", "coherence_cohesion", "lexical_resource", "grammatical_range"]):
                    avg1 = sum([result["task1"][key] for key in ["task_achievement", "coherence_cohesion", "lexical_resource", "grammatical_range"]]) / 4
                    result["task1"]["overall_band"] = round(avg1 * 2) / 2

            if "task2" in result:
                for key in ["task_response", "coherence_cohesion", "lexical_resource", "grammatical_range"]:
                    if key in result["task2"]:
                        result["task2"][key] = max(0.0, min(9.0, round(result["task2"][key] * 2) / 2))
                
                # Calculate task2 overall
                if all(key in result["task2"] for key in ["task_response", "coherence_cohesion", "lexical_resource", "grammatical_range"]):
                    avg2 = sum([result["task2"][key] for key in ["task_response", "coherence_cohesion", "lexical_resource", "grammatical_range"]]) / 4
                    result["task2"]["overall_band"] = round(avg2 * 2) / 2

            # Calculate overall band (Task 2 is 2/3, Task 1 is 1/3)
            if task1_text and "task1" in result and "task2" in result:
                overall = (result["task1"]["overall_band"] + result["task2"]["overall_band"] * 2) / 3
                result["overall_band"] = round(overall * 2) / 2
            elif "task2" in result:
                result["overall_band"] = result["task2"]["overall_band"]
            
            return result

        except Exception as e:
            print(f"Error in AI Writing scoring: {e}")
            # Fallback to basic scoring
            return self._fallback_writing_score(answers)

    def _fallback_speaking_score(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback basic scoring if AI fails"""
        texts = [val.strip() for key, val in answers.items() 
                 if key.startswith("speaking_") and isinstance(val, str) and val.strip()]
        
        if not texts:
            return {
                "fluency_coherence": 0.0,
                "lexical_resource": 0.0,
                "grammatical_range": 0.0,
                "pronunciation": 0.0,
                "overall_band": 0.0,
                "feedback": "No speaking responses provided.",
                "extended_analysis": {},
            }

        total_words = sum(len(t.split()) for t in texts)
        avg_words = total_words / len(texts)

        base = 5.5
        bonus = 1.0 if avg_words > 40 else 0.5 if avg_words > 25 else -1.0 if avg_words < 8 else 0.0

        def clamp(x): return max(2.5, min(8.0, x))

        fluency = clamp(base + bonus)
        lexical = clamp(base + bonus * 0.8)
        grammar = clamp(base + bonus * 0.7)
        pronunciation = clamp(base + bonus * 0.3)

        return {
            "fluency_coherence": round(fluency, 1),
            "lexical_resource": round(lexical, 1),
            "grammatical_range": round(grammar, 1),
            "pronunciation": round(pronunciation, 1),
            "overall_band": round((fluency + lexical + grammar + pronunciation) / 4, 1),
            "feedback": "AI scoring unavailable. Basic length-based estimate provided.",
            "extended_analysis": {},
        }

    def _fallback_writing_score(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback basic scoring if AI fails"""
        task2_text = answers.get("writing_task2", "").strip()
        
        if not task2_text:
            return {
                "task2": {
                    "task_response": 0.0,
                    "coherence_cohesion": 0.0,
                    "lexical_resource": 0.0,
                    "grammatical_range": 0.0,
                    "overall_band": 0.0,
                },
                "overall_band": 0.0,
                "feedback": "No Task 2 essay provided.",
                "extended_analysis": {},
            }

        words = len(task2_text.split())
        base = 6.5 if 100 <= words <= 144 else 4.5 if words < 50 else 6.0

        def clamp(x): return max(3.0, min(8.0, x))

        return {
            "task2": {
                "task_response": clamp(base),
                "coherence_cohesion": clamp(base),
                "lexical_resource": clamp(base - 0.5),
                "grammatical_range": clamp(base - 0.5),
                "overall_band": clamp(base),
            },
            "overall_band": clamp(base),
            "feedback": "AI scoring unavailable. Basic length-based estimate provided.",
            "extended_analysis": {},
        }

