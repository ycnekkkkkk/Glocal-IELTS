from typing import Any, Dict

from .gemini_service import GeminiService
from ..models import Level, Skill


class TestGeneratorService:
    """
    Generate IELTS-style diagnostic tests using Gemini.

    - Mỗi lần gọi chỉ TRẢ VỀ 1 kỹ năng (Listening / Speaking / Reading / Writing)
      để đúng với flow frontend.
    - Nội bộ có thể sinh nhiều thông tin hơn để giữ dữ liệu đồng bộ,
      nhưng API vẫn chỉ trả skill được yêu cầu.
    """

    def __init__(self) -> None:
        self.gemini = GeminiService()
        self.level_to_band = {
            Level.BEGINNER: "3.0-4.0",
            Level.ELEMENTARY: "4.0-4.5",
            Level.INTERMEDIATE: "5.0-5.5",
            Level.UPPER_INTERMEDIATE: "6.0-6.5",
            Level.ADVANCED: "7.5-8.0",
        }

    def generate(self, level: Level, skill: Skill) -> Dict[str, Any]:
        if skill == Skill.LISTENING:
            return {"listening": self._generate_listening(level)}
        if skill == Skill.SPEAKING:
            return {"speaking": self._generate_speaking(level)}
        if skill == Skill.READING:
            return {"reading": self._generate_reading(level)}
        if skill == Skill.WRITING:
            return {"writing": self._generate_writing(level)}
        raise ValueError(f"Unsupported skill: {skill}")

    # ---------- LISTENING ----------

    def _generate_listening(self, level: Level) -> Dict[str, Any]:
        band = self.level_to_band.get(level, "5.0-5.5")
        system_instruction = "You are an expert IELTS examiner. Generate test content in JSON format only."

        listening_prompt = f"""
Generate an IELTS Listening test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

LISTENING (20 mins, 4 sections, 5 questions/section = 20 questions total):
  - Section 1: Daily conversation (Multiple choice only).
  - Section 2: Social monologue (Multiple choice / matching).
  - Section 3: Academic conversation (Multiple choice only).
  - Section 4: Academic lecture (Multiple choice / matching).

IMPORTANT:
- ALL Listening questions MUST be CHOICE-BASED.
- Do NOT use "short_answer" or "sentence_completion" types.
- Every question MUST provide an "options" array of possible answers.
- Candidates always SELECT an answer; they NEVER type free text.

**AUDIO RULES:**
- Output field name: "listening".
- "listening.sections" MUST be an array of 4 sections.
- Each section object MUST contain:
  - "id": 1–4
  - "title": string
  - "instructions": string
  - "audio_transcript": array of at least 10 objects
  - "questions": array of 5 question objects

- Each "audio_transcript" line MUST be an object: {{"speaker": "male"|"female", "text": "sentence"}}.
- Section 1 & 3 are DIALOGUES:
  - speakers MUST alternate strictly male → female → male → female → ...
  - both speakers must appear at least 4 times each.
- Section 2 & 4 are MONOLOGUES:
  - all lines must share ONE consistent speaker ("male" OR "female").
  - at least 8 lines.

**SEMANTIC RULES:**
- Each section must be a complete, coherent conversation/talk with clear context.
- All information needed to answer every question MUST appear in the transcript.
- Questions must test different aspects: main idea, specific detail, numbers, dates, reasons, etc.

**QUESTION FORMAT:**
- Each question object MUST contain:
  - "id": integer
  - "type": "multiple_choice" | "matching" | "true_false_not_given"
  - "question": string
  - "options": array of strings (REQUIRED for ALL question types; every question is choice-based)
  - "items": optional array for multi-item matching questions
  - "correct_answer": string
  - "question_type": short tag summarising the type, e.g. "listening_multiple_choice_detail"

### OUTPUT JSON STRUCTURE (ONLY LISTENING):
{{
  "listening": {{
    "sections": [
      {{
        "id": 1,
        "title": "string",
        "instructions": "string",
        "audio_transcript": [
          {{"speaker": "male", "text": "Example sentence."}}
        ],
        "questions": [
          {{
            "id": 1,
            "type": "multiple_choice",
            "question_type": "listening_multiple_choice_detail",
            "question": "string",
            "options": ["A. ...", "B. ...", "C. ..."],
            "correct_answer": "A. ..."
          }}
        ]
      }}
    ]
  }}
}}
"""

        content = self.gemini.generate_json(
            listening_prompt, system_instruction, force_key=1
        )
        return content.get("listening", {})

    # ---------- SPEAKING ----------

    def _generate_speaking(self, level: Level) -> Dict[str, Any]:
        band = self.level_to_band.get(level, "5.0-5.5")
        system_instruction = "You are an expert IELTS examiner. Generate test content in JSON format only."

        speaking_prompt = f"""
Generate an IELTS Speaking test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

SPEAKING (3 parts):
  - Part 1: 3–4 intro questions (hometown, study/work, habits). Each has 20 seconds answer time.
  - Part 2: 1 cue card (topic + bullet points). 60 seconds preparation, 120 seconds speaking.
  - Part 3: 3–4 analytical questions related to Part 2. Each about 30 seconds.

### OUTPUT JSON STRUCTURE (ONLY SPEAKING):
{{
  "speaking": {{
    "part1": [
      {{
        "id": 1,
        "question": "string",
        "time_limit": 20
      }}
    ],
    "part2": {{
      "topic": "string",
      "task_card": "string",
      "preparation_time": 60,
      "speaking_time": 120
    }},
    "part3": [
      {{
        "id": 1,
        "question": "string",
        "time_limit": 30
      }}
    ]
  }}
}}
"""

        content = self.gemini.generate_json(
            speaking_prompt, system_instruction, force_key=2
        )
        return content.get("speaking", {})

    # ---------- READING ----------

    def _generate_reading(self, level: Level) -> Dict[str, Any]:
        band = self.level_to_band.get(level, "5.0-5.5")
        system_instruction = "You are an expert IELTS examiner. Generate test content in JSON format only."

        reading_prompt = f"""
Generate an IELTS Reading test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

READING (2 passages, 20 questions total):

Passage 1 (informational, 300–400 words):
  - Contains chart/graph/table-style data.
  - MUST include "chart_data" and "chart_description".
  - Use 5 different official IELTS question types chosen from:
    multiple_choice, true_false_not_given, yes_no_not_given,
    matching_headings, matching_information, classification.

Passage 2 (social or societal topic, 300–400 words):
  - Use 5 different question types (different set from Passage 1).
  - Include inference, opinion and paraphrasing style questions.

IMPORTANT:
- ALL Reading questions MUST be CHOICE-BASED (no free-text answers).
- Do NOT use "short_answer" or "sentence_completion" types.
- Every Reading question MUST provide an "options" array of possible answers.
- Candidates always SELECT an answer; they NEVER type free text.

**GLOBAL RULES:**
- Total 20 questions across 2 passages.
- At least 10 distinct "question_type" tags overall (5 per passage).
- Each question object MUST contain:
  - "id": integer,
  - "type": one of the IELTS reading types above,
  - "question": string,
  - "options": array of strings for ALL question types (every Reading question is choice-based),
    * For matching_headings/matching_information: MUST be array of strings like ["i. Heading 1", "ii. Heading 2", "iii. Heading 3"]
    * For multiple_choice: array of strings like ["A. Option 1", "B. Option 2", "C. Option 3"]
  - "items": optional array for matching_headings / matching_information,
    * MUST be array of strings like ["A", "B", "C"] or ["Paragraph 1", "Paragraph 2"]
  - "correct_answer": string (REQUIRED for ALL questions - NEVER omit this field),
    * For matching with items, use format "A:i, B:ii, C:iii"
    * For single-answer questions, use the exact option text or label
  - "question_type": short tag e.g. "reading_multiple_choice_main_idea".

**CRITICAL:**
- EVERY question MUST have a "correct_answer" field with a valid answer.
- NEVER generate a question without a correct_answer.
- For matching_headings: correct_answer format MUST be "A:i, B:ii, C:iii" (paragraph letter:label).
- For classification: correct_answer format MUST be "item1:B, item2:A" (item:label).

**CRITICAL FOR MATCHING QUESTIONS:**

There are TWO types of matching questions:

1. **SINGLE MATCHING** (one item to match):
   - Type: "matching_headings" or "matching_information"
   - Question format: "Choose the correct heading for Paragraph B from the list below."
   - Structure:
     * "items": [] (empty array or omit this field)
     * "options": ["i. Heading 1", "ii. Heading 2", "iii. Heading 3"] (MUST be array of strings)
     * "correct_answer": "i. Heading 1" (single string, matching one option)
   - Example:
     {{
       "id": 3,
       "type": "matching_headings",
       "question_type": "reading_matching_headings_single",
       "question": "Choose the correct heading for Paragraph B from the list below.",
       "options": ["i. Introduction", "ii. Main findings", "iii. Conclusion"],
       "items": [],
       "correct_answer": "ii. Main findings"
     }}

2. **MULTI-ITEM MATCHING** (multiple items to match):

   **A. matching_information** (matching statements with paragraphs):
   - Question format: "Which paragraph (A-D) contains the following information?"
   - Structure:
     * "items": Array of statements to match, e.g. ["A general overview of e-commerce's impact", "A reason for Asia-Pacific's leading position", "Future developments expected in the e-commerce sector"]
     * "options": MUST be paragraph letters: ["A", "B", "C", "D"] (NOT headings, NOT questions, just letters)
     * "correct_answer": "A general overview of e-commerce's impact:A, A reason for Asia-Pacific's leading position:B, Future developments expected in the e-commerce sector:D"
   - Example:
     {{
       "id": 4,
       "type": "matching_information",
       "question_type": "reading_matching_information",
       "question": "Which paragraph (A-D) contains the following information?",
       "options": ["A", "B", "C", "D"],
       "items": ["A general overview of e-commerce's impact", "A reason for Asia-Pacific's leading position", "Future developments expected in the e-commerce sector"],
       "correct_answer": "A general overview of e-commerce's impact:A, A reason for Asia-Pacific's leading position:B, Future developments expected in the e-commerce sector:D"
     }}

   **B. matching_headings** (matching paragraphs with headings):
   - Question format: "Match each paragraph with the correct heading."
   - Structure:
     * "items": Array of paragraph identifiers, e.g. ["A", "B", "C"] or ["Paragraph A", "Paragraph B", "Paragraph C"]
     * "options": Array of headings, e.g. ["i. Introduction", "ii. Main findings", "iii. Conclusion"]
     * "correct_answer": MUST use format "A:i, B:ii, C:iii" where:
       - Left side (A, B, C) is the paragraph identifier (extract from items)
       - Right side (i, ii, iii) is ONLY the label from options (NOT full text, just "i", "ii", "iii")
     * CRITICAL: Use ONLY the label part (before the period) from options, e.g. "i" not "i. Introduction"
   - Example:
     {{
       "id": 5,
       "type": "matching_headings",
       "question_type": "reading_matching_headings",
       "question": "Match each paragraph with the correct heading.",
       "options": ["i. Introduction", "ii. Main findings", "iii. Conclusion"],
       "items": ["A", "B", "C"],
       "correct_answer": "A:i, B:ii, C:iii"
     }}
   - Example with "Paragraph X" format:
     {{
       "id": 6,
       "type": "matching_headings",
       "question_type": "reading_matching_headings",
       "question": "Match each paragraph with the correct heading.",
       "options": ["i. Advantages for communities", "ii. Disadvantages and concerns", "iii. Future prospects"],
       "items": ["Paragraph A", "Paragraph B", "Paragraph C"],
       "correct_answer": "A:i, B:ii, C:iii"
     }}
     NOTE: Even if items are "Paragraph A", use just "A" in correct_answer (the paragraph letter)

**REQUIREMENTS:**
- "options" MUST always be an array of strings, NEVER objects or nested structures
- "items" MUST be an array of strings if provided, NEVER objects
- For single matching: "items" should be empty array [] or omitted
- For multi-item matching: "items" MUST have same length as number of items to match

### OUTPUT JSON STRUCTURE (ONLY READING):
{{
  "reading": {{
    "passages": [
      {{
        "id": 1,
        "title": "string",
        "content": "300-400 word passage",
        "chart_data": {{"type": "bar", "title": "Chart Title", "labels": ["A","B","C"], "data": [10,20,30], "xAxis": "Category", "yAxis": "Value"}},
        "chart_description": "Detailed text version of the data",
        "questions": [
          {{
            "id": 1,
            "type": "multiple_choice",
            "question_type": "reading_multiple_choice_detail",
            "question": "string",
            "options": ["i. ...", "ii. ...", "iii. ..."],
            "items": [],
            "correct_answer": "i. ..."
          }}
        ]
      }},
      {{
        "id": 2,
        "title": "string",
        "content": "300-400 word passage",
        "questions": [
          {{
            "id": 1,
            "type": "true_false_not_given",
            "question_type": "reading_true_false_not_given_inference",
            "question": "string",
            "options": ["True", "False", "Not Given"],
            "items": [],
            "correct_answer": "True"
          }},
          {{
            "id": 2,
            "type": "matching_headings",
            "question_type": "reading_matching_headings_single",
            "question": "Choose the correct heading for Paragraph B from the list below.",
            "options": ["i. Introduction to the topic", "ii. Main research findings", "iii. Conclusion and recommendations"],
            "items": [],
            "correct_answer": "ii. Main research findings"
          }},
          {{
            "id": 3,
            "type": "matching_information",
            "question_type": "reading_matching_information",
            "question": "Which paragraph (A-D) contains the following information?",
            "options": ["A", "B", "C", "D"],
            "items": ["A general overview of e-commerce's impact", "A reason for Asia-Pacific's leading position", "Future developments expected in the e-commerce sector"],
            "correct_answer": "A general overview of e-commerce's impact:A, A reason for Asia-Pacific's leading position:B, Future developments expected in the e-commerce sector:D"
          }},
          {{
            "id": 4,
            "type": "matching_headings",
            "question_type": "reading_matching_headings",
            "question": "Match each paragraph with the correct heading.",
            "options": ["i. Introduction", "ii. Main findings", "iii. Conclusion"],
            "items": ["A", "B", "C"],
            "correct_answer": "A:i, B:ii, C:iii"
          }}
        ]
      }}
    ]
  }}
}}
"""

        content = self.gemini.generate_json(
            reading_prompt, system_instruction, force_key=1
        )
        return content.get("reading", {})

    # ---------- WRITING ----------

    def _generate_writing(self, level: Level) -> Dict[str, Any]:
        band = self.level_to_band.get(level, "5.0-5.5")
        system_instruction = "You are an expert IELTS examiner. Generate test content in JSON format only."

        writing_prompt = f"""
Generate an IELTS Writing test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

WRITING (2 tasks):

Task 1 (50–80 words):
  - Academic-style chart or table description.
  - Must focus on key features, comparisons, trends or changes.
  - Provide:
    - "instructions": clear description of what the candidate must do.
    - "chart_data": object with type, title, labels, data, xAxis, yAxis.
    - "chart_description": text fallback describing raw data.
    - "min_words": 50, "max_words": 80.

Task 2 (100–120 words):
  - Essay on a social/societal topic.
  - Essay type: opinion | discussion | problem-solution | advantages-disadvantages | double-question.
  - Provide:
    - "question": the full essay question.
    - "essay_type": one of the types above.
    - "min_words": 100, "max_words": 120.

### OUTPUT JSON STRUCTURE (ONLY WRITING):
{{
  "writing": {{
    "task1": {{
      "instructions": "string",
      "chart_data": {{"type": "bar", "title": "Chart Title", "labels": ["A","B","C"], "data": [10,20,30], "xAxis": "Category", "yAxis": "Value"}},
      "chart_description": "Detailed text data...",
      "min_words": 50,
      "max_words": 80,
      "linked_to_passage": 1
    }},
    "task2": {{
      "question": "string",
      "essay_type": "opinion | discussion | problem-solution | advantages-disadvantages | double-question",
      "min_words": 100,
      "max_words": 120,
      "linked_to_passage": 2
    }}
  }}
}}
"""

        content = self.gemini.generate_json(
            writing_prompt, system_instruction, force_key=2
        )
        return content.get("writing", {})
