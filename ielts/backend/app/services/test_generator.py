import json
from typing import Dict, Any
from app.services.gemini_service import GeminiService
from app.models.test_session import Level, Phase


class TestGeneratorService:
    """Service for generating IELTS test content using Gemini"""

    def __init__(self):
        self.gemini = GeminiService()

        self.level_to_band = {
            Level.BEGINNER: "3.0-4.0",
            Level.ELEMENTARY: "4.0-4.5",
            Level.INTERMEDIATE: "5.0-5.5",
            Level.UPPER_INTERMEDIATE: "6.0-6.5",
            Level.ADVANCED: "7.5-8.0",
        }

    def generate_listening_speaking(self, level: Level) -> Dict[str, Any]:
        """Generate Listening & Speaking test content (30 minutes)
        Uses Key 1 for Listening, Key 2 for Speaking to avoid rate limits
        """
        band = self.level_to_band.get(level, "5.0-5.5")

        system_instruction = """You are an expert IELTS examiner. Generate test content in JSON format only."""

        # Generate Listening with Key 1
        print("Generating Listening section with Key 1...")
        listening_prompt = f"""
Generate an IELTS Listening test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

1. LISTENING (20 mins, 4 sections, 5 questions/section = 20 questions total):
   - Section 1: Daily conversation (Multiple choice/Fill-blank).
   - Section 2: Social monologue (Multiple choice/Matching).
   - Section 3: Academic conversation (Multiple choice/Short answer).
   - Section 4: Academic lecture (Fill-blank/Matching).
   
   **CRITICAL AUDIO RULES (MUST FOLLOW STRICTLY - OUTPUT IS INVALID IF VIOLATED):**
   - audio_transcript MUST be an ARRAY (NOT a string).
   - audio_transcript MUST contain AT LEAST 10 lines per section.
   - Each line MUST be an object with:
     * speaker: "male" and "female" (exactly these values, no variations)
     * text: natural spoken English (one sentence or short phrase per line)
   
   **DIALOGUE SECTIONS (Section 1 & Section 3):**
   - MUST alternate speakers STRICTLY: male → female → male → female → ...
   - MUST include BOTH male and female voices MULTIPLE times (at least 4-5 times each).
   - MUST NOT end after a single speaker - must have multiple exchanges.
   - First line can be either male or female, then MUST alternate.
   - Example valid pattern: [male, female, male, female, male, female, male, female, ...]
   - Example INVALID: [male, male, female] or [male] or [female, female]
   
   **MONOLOGUE SECTIONS (Section 2 & Section 4):**
   - MUST contain AT LEAST 8 lines from ONE speaker (either all "male" OR all "female").
   - MUST use consistent speaker throughout (all male OR all female, not mixed).
   - Example valid: [male, male, male, male, male, male, male, male, ...] OR [female, female, female, ...]
   - Example INVALID: [male, female, male] or [male] (too few lines)
   
   **VALIDATION CHECKLIST (Your output will be rejected if any rule is violated):**
   - ✓ Is audio_transcript an array? (NOT a string)
   - ✓ Does each section have at least 10 lines?
   - ✓ For Section 1 & 3: Do speakers alternate strictly (male-female-male-female)?
   - ✓ For Section 1 & 3: Are BOTH male and female present multiple times?
   - ✓ For Section 2 & 4: Is there at least 8 lines from ONE consistent speaker?
   - ✓ For Section 2 & 4: Are all speakers the same (all male OR all female)?
   
   **CRITICAL: SEMANTIC COMPLETENESS (MUST FOLLOW - OUTPUT IS INVALID IF VIOLATED):**
   - audio_transcript MUST be semantically COMPLETE and COHERENT:
     * Each section MUST tell a complete story/conversation with clear beginning, middle, and end
     * All information MUST be logically connected and flow naturally
     * Context MUST be fully established (who, what, where, when, why)
     * No abrupt cuts or incomplete thoughts
     * Dialogue MUST have natural exchanges with proper responses and follow-ups
     * Monologue MUST have clear structure: introduction → main points → conclusion
   - Example INVALID: Audio that jumps topics, lacks context, or ends mid-sentence
   - Example VALID: Complete conversation about booking a hotel with all details naturally revealed
   
   **CRITICAL: AUDIO-QUESTION ALIGNMENT (MUST FOLLOW - OUTPUT IS INVALID IF VIOLATED):**
   - audio_transcript MUST contain ALL information needed to answer EVERY question in that section
   - Each question's correct_answer MUST be explicitly stated or clearly implied in the audio
   - Questions MUST be answerable ONLY from the audio content (not from general knowledge)
   - Information for each question MUST appear in logical order within the audio
   - For multiple choice: All options should be mentioned or referenced, with the correct one clearly stated
   - For fill-in-the-blank: The exact answer word/phrase MUST be spoken in the audio
   - For matching: All items and their correct matches MUST be mentioned in the audio
   - VALIDATION: After generating, verify that every question can be answered from the audio transcript
   
   **CRITICAL: LISTENING PACE & RHYTHM (MUST FOLLOW - OUTPUT IS INVALID IF VIOLATED):**
   - Each line MUST be appropriate length for natural speech:
     * Short lines: 5-15 words (for quick exchanges, confirmations, questions)
     * Medium lines: 15-25 words (for explanations, descriptions)
     * Long lines: 25-35 words (for detailed information, but use sparingly)
   - Pacing MUST be realistic:
     * Dialogue sections: Mix of short and medium lines (natural conversation rhythm)
     * Monologue sections: Mix of medium and long lines (lecture/presentation style)
   - Spacing between information:
     * Answers to questions MUST NOT be clustered together - spread them throughout the audio
     * Leave 2-4 lines between answers to different questions (realistic listening pace)
     * Don't rush - allow natural pauses and transitions
   - Example INVALID: All answers in first 3 lines, then 7 lines of filler
   - Example VALID: Answer 1 (lines 2-3), Answer 2 (lines 5-6), Answer 3 (lines 8-9), etc.
   
   - CRITICAL: Each question must be UNIQUE and DIFFERENT. Do NOT repeat similar questions or test the same information point.
   - Each question should test different aspects: main ideas, specific details, numbers, names, locations, dates, reasons, etc.
   - IMPORTANT: For matching questions, provide 'options' array with choices like ["A. Option 1", "B. Option 2", "C. Option 3"].

### OUTPUT JSON STRUCTURE (ONLY LISTENING):
{{
  "listening": {{
    "sections": [
      {{
        "id": 1,
        "title": "string",
        "instructions": "string",
        "audio_transcript": [
          {{"speaker": "male", "text": "Hello, I'd like to book a room for next week."}},
          {{"speaker": "female", "text": "Certainly, what dates are you looking for?"}},
          {{"speaker": "male", "text": "From the 15th to the 20th of next month."}},
          {{"speaker": "female", "text": "Let me check availability for those dates."}},
          {{"speaker": "male", "text": "That would be perfect, thank you."}},
          {{"speaker": "female", "text": "We have a double room available for that period."}},
          {{"speaker": "male", "text": "What's the price per night?"}},
          {{"speaker": "female", "text": "It's 85 pounds per night, including breakfast."}},
          {{"speaker": "male", "text": "That sounds reasonable. I'll take it."}},
          {{"speaker": "female", "text": "Great, I'll need your name and contact details."}},
          {{"speaker": "male", "text": "My name is John Smith."}},
          {{"speaker": "female", "text": "And your phone number?"}},
          {{"speaker": "male", "text": "It's 07700 900123."}},
          {{"speaker": "female", "text": "Perfect. Your booking is confirmed for the 15th to 20th."}}
        ],
        "questions": [
          {{
            "id": 1,
            "type": "multiple_choice | fill_blank | matching | short_answer",
            "question": "string",
            "options": ["A", "B", "C"], // Required for MC and matching types
            "correct_answer": "string"
          }}
        ]
      }}
    ]
  }}
}}
"""

        # Generate Listening with Key 1
        listening_content = self.gemini.generate_json(
            listening_prompt, system_instruction, force_key=1
        )
        print("✓ Listening section generated with Key 1")

        # Validate audio transcripts
        self._validate_audio_transcripts(listening_content)

        # Generate Speaking with Key 2
        print("Generating Speaking section with Key 2...")
        speaking_prompt = f"""
Generate an IELTS Speaking test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

SPEAKING (10 mins):
   - Part 1: 3-4 Intro questions (hometown, study/work, etc.). Each question allows 20 seconds to answer.
   - Part 2: 1 Cue card (topic + bullet points). 1 minute preparation time, 2 minutes speaking time.
   - Part 3: 3-4 Analytical questions related to Part 2. Each question allows 30 seconds to answer.

### OUTPUT JSON STRUCTURE (ONLY SPEAKING):
{{
  "speaking": {{
    "part1": [
      {{
        "id": 1,
        "question": "string",
        "time_limit": 20 // seconds
      }}
    ],
    "part2": {{
      "topic": "string",
      "task_card": "string",
      "preparation_time": 60, // seconds
      "speaking_time": 120 // seconds
    }},
    "part3": [
      {{
        "id": 1,
        "question": "string",
        "time_limit": 30 // seconds
      }}
    ]
  }}
}}
"""

        speaking_content = self.gemini.generate_json(
            speaking_prompt, system_instruction, force_key=2
        )
        print("✓ Speaking section generated with Key 2")

        # Merge Listening and Speaking
        merged_content = {
            "listening": listening_content.get("listening", {}),
            "speaking": speaking_content.get("speaking", {}),
        }

        return merged_content

    def _validate_audio_transcripts(self, content: Dict[str, Any]) -> None:
        """Validate audio_transcript format for all listening sections"""
        if not isinstance(content, dict):
            return

        listening = content.get("listening", {})
        sections = listening.get("sections", [])

        for section in sections:
            section_id = section.get("id", "unknown")
            audio_transcript = section.get("audio_transcript")

            # Check if audio_transcript exists
            if not audio_transcript:
                raise ValueError(
                    f"Section {section_id}: audio_transcript is missing. "
                    "Each section MUST have an audio_transcript array."
                )

            # Check if it's an array
            if not isinstance(audio_transcript, list):
                raise ValueError(
                    f"Section {section_id}: audio_transcript must be an ARRAY, "
                    f"not {type(audio_transcript).__name__}. "
                    f"Received: {str(audio_transcript)[:100]}"
                )

            # Check minimum length (at least 10 lines for all sections)
            if len(audio_transcript) < 10:
                raise ValueError(
                    f"Section {section_id}: audio_transcript must have AT LEAST 10 lines. "
                    f"Found only {len(audio_transcript)} lines."
                )

            # Validate each line format
            speakers = []
            for idx, line in enumerate(audio_transcript):
                if not isinstance(line, dict):
                    raise ValueError(
                        f"Section {section_id}, line {idx + 1}: Each line must be an object "
                        f"with 'speaker' and 'text'. Found: {type(line).__name__}"
                    )

                speaker = line.get("speaker")
                text = line.get("text")

                if speaker not in ["male", "female"]:
                    raise ValueError(
                        f"Section {section_id}, line {idx + 1}: speaker must be 'male' or 'female', "
                        f"not '{speaker}'"
                    )

                if not text or not isinstance(text, str) or not text.strip():
                    raise ValueError(
                        f"Section {section_id}, line {idx + 1}: text must be a non-empty string"
                    )

                speakers.append(speaker)

            # Validate dialogue sections (Section 1 & 3)
            if section_id in [1, 3]:
                # Check if both speakers are present
                if "male" not in speakers or "female" not in speakers:
                    raise ValueError(
                        f"Section {section_id}: Dialogue section MUST include BOTH male and female speakers. "
                        f"Found only: {set(speakers)}"
                    )

                # Check if speakers alternate strictly
                for i in range(len(speakers) - 1):
                    if speakers[i] == speakers[i + 1]:
                        raise ValueError(
                            f"Section {section_id}: Dialogue section MUST alternate speakers strictly. "
                            f"Found consecutive '{speakers[i]}' at lines {i + 1} and {i + 2}. "
                            f"Pattern should be: male → female → male → female → ..."
                        )

                # Check if both speakers appear multiple times (at least 4 times each)
                male_count = speakers.count("male")
                female_count = speakers.count("female")
                if male_count < 4 or female_count < 4:
                    raise ValueError(
                        f"Section {section_id}: Dialogue section MUST have BOTH speakers appear "
                        f"at least 4 times each. Found: male={male_count}, female={female_count}"
                    )

            # Validate monologue sections (Section 2 & 4)
            elif section_id in [2, 4]:
                # Check if all speakers are the same
                unique_speakers = set(speakers)
                if len(unique_speakers) > 1:
                    raise ValueError(
                        f"Section {section_id}: Monologue section MUST use ONE consistent speaker. "
                        f"Found multiple speakers: {unique_speakers}"
                    )

                # Check minimum length (at least 8 lines)
                if len(audio_transcript) < 8:
                    raise ValueError(
                        f"Section {section_id}: Monologue section MUST have at least 8 lines. "
                        f"Found only {len(audio_transcript)} lines."
                    )

            # Validate listening pace (line lengths)
            line_lengths = [
                len(line.get("text", "").split()) for line in audio_transcript
            ]
            avg_length = sum(line_lengths) / len(line_lengths) if line_lengths else 0
            too_short_lines = sum(1 for length in line_lengths if length < 3)
            too_long_lines = sum(1 for length in line_lengths if length > 40)

            if too_short_lines > len(audio_transcript) * 0.3:
                raise ValueError(
                    f"Section {section_id}: Too many very short lines ({too_short_lines}/{len(audio_transcript)}). "
                    "Lines should be 5-35 words for natural speech."
                )

            if too_long_lines > len(audio_transcript) * 0.2:
                raise ValueError(
                    f"Section {section_id}: Too many very long lines ({too_long_lines}/{len(audio_transcript)}). "
                    "Most lines should be 5-35 words for natural listening pace."
                )

            print(
                f"✓ Section {section_id} audio_transcript validated: {len(audio_transcript)} lines "
                f"(avg {avg_length:.1f} words/line)"
            )

    def generate_reading_writing(self, level: Level) -> Dict[str, Any]:
        """Generate Reading & Writing test content (30 minutes)
        Uses Key 1 for Reading, Key 2 for Writing to avoid rate limits

        Reading: 2 passages, 20 questions total (10 different question types)
        Passage 1: Contains chart/visual data, linked to Writing Task 1
        Passage 2: Social topic, linked to Writing Task 2
        """
        band = self.level_to_band.get(level, "5.0-5.5")

        system_instruction = """You are an expert IELTS examiner. Generate test content in JSON format only."""

        # Generate Reading with Key 1
        print("Generating Reading section with Key 1...")
        reading_prompt = f"""
Generate an IELTS Reading test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

READING (15 mins, 2 passages, 20 questions total):
   
   **Passage 1 (10 questions):**
   - Contains a chart, graph, table, or visual data (300-400 words)
   - Question types must align with factual comparison and trend analysis
   - Must use 5 different official IELTS question types from: multiple_choice, true_false_not_given, yes_no_not_given, matching_headings, matching_information, sentence_completion, short_answer, classification
   - Questions should test: main features, trends, comparisons, specific data points
   - MUST include 'chart_data' object with structure: {{"type": "bar|line|pie|table", "title": "Chart Title", "labels": ["Label1", "Label2"], "data": [10, 20, 30], "xAxis": "X Label", "yAxis": "Y Label"}}
   - Also provide 'chart_description' as text fallback with all raw data
   
   **Passage 2 (10 questions):**
   - Social or societal topic article (300-400 words)
   - Must use 5 different official IELTS question types (different from Passage 1)
   - Question types must include: inference, opinion, paraphrasing
   - Questions should test: main ideas, author's opinion, inferences, vocabulary, comparisons
   
   **CRITICAL:**
   - Total 20 questions across both passages
   - Use 10 DIFFERENT question types total (5 per passage)
   - Each question must be UNIQUE and test different aspects
   - For matching_headings: provide "items" array for multi-item matching, "options" array with headings
   - For true_false_not_given/yes_no_not_given: correct_answer must be "True", "False", "Not Given", "Yes", "No", or "Not Given"

### OUTPUT JSON STRUCTURE (ONLY READING):
{{
  "reading": {{
    "passages": [
      {{
        "id": 1,
        "title": "string",
        "content": "string",
        "chart_data": {{"type": "bar", "title": "Chart Title", "labels": ["A", "B", "C"], "data": [10, 20, 30], "xAxis": "Category", "yAxis": "Value"}},
        "chart_description": "Detailed text data...",
        "questions": [
          {{
            "id": 1,
            "type": "multiple_choice | true_false_not_given | yes_no_not_given | matching_headings | matching_information | sentence_completion | short_answer",
            "question": "string",
            "options": ["i. Option 1", "ii. Option 2"], // Required for MC, matching, classification
            "items": ["A", "B", "C"], // Optional: for matching_headings with multiple items
            "correct_answer": "string" // For matching with items: "A:i, B:ii, C:iii"
          }}
        ]
      }},
      {{
        "id": 2,
        "title": "string",
        "content": "string",
        "questions": [
          {{
            "id": 1,
            "type": "multiple_choice | true_false_not_given | yes_no_not_given | matching_headings | matching_information | sentence_completion | short_answer",
            "question": "string",
            "options": ["i. Option 1", "ii. Option 2"],
            "items": ["A", "B", "C"], // Optional
            "correct_answer": "string"
          }}
        ]
      }}
    ]
  }}
}}
"""

        # Generate Reading with Key 1
        reading_content = self.gemini.generate_json(
            reading_prompt, system_instruction, force_key=1
        )
        print("✓ Reading section generated with Key 1")

        # Extract chart_data and passage 2 topic for Writing
        passage1 = (
            reading_content.get("reading", {}).get("passages", [{}])[0]
            if reading_content.get("reading", {}).get("passages")
            else {}
        )
        chart_data = passage1.get("chart_data", {})
        chart_description = passage1.get("chart_description", "")
        passage2 = (
            reading_content.get("reading", {}).get("passages", [{}])[1]
            if len(reading_content.get("reading", {}).get("passages", [])) > 1
            else {}
        )
        passage2_topic = (
            passage2.get("title", "") or passage2.get("content", "")[:100]
            if passage2
            else ""
        )

        # Generate Writing with Key 2
        print("Generating Writing section with Key 2...")
        writing_prompt = f"""
Generate an IELTS Writing test for {level.value} level (IELTS {band}) in JSON format.

### CONTENT REQUIREMENTS:

WRITING (15 mins):
   
   **Task 1 (50-80 words):**
   - Describe key features, trends, differences, or changes
   - MUST be based on the visual data from Reading Passage 1
   - Use the chart_data provided below from Passage 1
   - Instructions should reference the chart/graph from Passage 1
   
   **Task 2 (100-120 words):**
   - Opinion / discussion / problem-solution essay
   - MUST be based on the topic of Reading Passage 2
   - Passage 2 topic: {passage2_topic}
   - Question should relate to the social/societal theme from Passage 2

### OUTPUT JSON STRUCTURE (ONLY WRITING):
{{
  "writing": {{
    "task1": {{
      "instructions": "Summarise the information by selecting and reporting the main features from the chart in Passage 1, and make comparisons where relevant.",
      "chart_data": {json.dumps(chart_data) if chart_data else '{{"type": "bar", "title": "Chart Title", "labels": ["A", "B", "C"], "data": [10, 20, 30], "xAxis": "Category", "yAxis": "Value"}}'},
      "chart_description": "{chart_description[:200] if chart_description else "Detailed text data..."}",
      "min_words": 50,
      "max_words": 80,
      "linked_to_passage": 1
    }},
    "task2": {{
      "question": "string (based on Passage 2 topic: {passage2_topic[:50]})",
      "min_words": 100,
      "max_words": 120,
      "linked_to_passage": 2
    }}
  }}
}}
"""

        writing_content = self.gemini.generate_json(
            writing_prompt, system_instruction, force_key=2
        )
        print("✓ Writing section generated with Key 2")

        # Merge Reading and Writing
        merged_content = {
            "reading": reading_content.get("reading", {}),
            "writing": writing_content.get("writing", {}),
        }

        # Ensure Writing Task 1 has chart_data from Reading Passage 1
        if chart_data and merged_content.get("writing", {}).get("task1"):
            merged_content["writing"]["task1"]["chart_data"] = chart_data
            if chart_description:
                merged_content["writing"]["task1"][
                    "chart_description"
                ] = chart_description

        return merged_content
