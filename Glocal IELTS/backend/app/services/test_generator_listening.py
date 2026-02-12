from typing import List, Dict, Any

from ..models import Level


def _dialogue_section(
    section_id: int, title: str, instructions: str, base_difficulty: int
) -> Dict[str, Any]:
    """
    Build a dialogue section (Section 1 or 3) with male/female alternating.
    base_difficulty controls vocabulary / topic complexity very lightly.
    """
    # Simple vocabulary scaling by level
    if base_difficulty <= 1:
        context = "a simple conversation about booking a room at a small guesthouse"
    elif base_difficulty == 2:
        context = "a conversation about arranging an English course at a local language school"
    else:
        context = "an academic discussion between a student and an advisor about a research project"

    transcript: List[Dict[str, str]] = []
    speakers = ["male", "female"]
    turns = [
        "Excuse me, I would like to get some information.",
        "Of course. How can I help you today?",
        f"I am interested in {context}, but I am not sure where to start.",
        "No problem. Let me explain the main options you have.",
        "That would be great. I do not have much experience with this.",
        "First, I need to know your basic needs and your budget.",
        "I see. My budget is quite limited, so I need something affordable.",
        "In that case, I can suggest a few choices that many people find reasonable.",
        "Thank you. Could you also tell me about any extra services included?",
        "Yes, I will give you a clear summary so you can compare them.",
        "That sounds very helpful. I want to make a good decision.",
        "You are welcome. I will also write down the details for you.",
    ]

    for i, text in enumerate(turns):
        transcript.append({"speaker": speakers[i % 2], "text": text})

    questions = [
        {
            "id": 1,
            "type": "multiple_choice",
            "question_type": "listening_multiple_choice",
            "question": "What is the main purpose of the conversation?",
            "options": [
                "A. To complain about a bad experience",
                "B. To get basic information and options",
                "C. To confirm a final booking",
            ],
            "correct_answer": "B. To get basic information and options",
        },
        {
            "id": 2,
            "type": "short_answer",
            "question_type": "listening_short_answer",
            "question": "What is the main concern of the listener?",
            "correct_answer": "limited budget",
        },
        {
            "id": 3,
            "type": "sentence_completion",
            "question_type": "listening_sentence_completion",
            "question": "The speaker will write down __________ for the listener.",
            "correct_answer": "the details",
        },
        {
            "id": 4,
            "type": "true_false_not_given",
            "question_type": "listening_true_false_not_given",
            "question": "The listener already has a lot of experience with this situation.",
            "options": ["True", "False", "Not Given"],
            "correct_answer": "False",
        },
        {
            "id": 5,
            "type": "matching",
            "question_type": "listening_matching",
            "question": "Match each topic with what the speaker will provide.",
            "items": ["Budget", "Extra services"],
            "options": [
                "A. A list of choices",
                "B. A clear summary",
            ],
            "correct_answer": "Budget:A, Extra services:B",
        },
    ]

    return {
        "id": section_id,
        "title": title,
        "instructions": instructions,
        "audio_transcript": transcript,
        "questions": questions,
    }


def _monologue_section(
    section_id: int, title: str, instructions: str, base_difficulty: int
) -> Dict[str, Any]:
    """Build a monologue section (Section 2 or 4) with single speaker."""
    if base_difficulty <= 1:
        topic = "a guide talking about a small city tour for visitors"
    elif base_difficulty == 2:
        topic = "a college teacher explaining how to prepare for a group project"
    else:
        topic = "a lecturer describing the main stages of a research survey"

    speaker = "female"
    lines = [
        f"Good morning everyone. Today I am going to talk about {topic}.",
        "First, I will describe the overall plan so you know what to expect.",
        "We will begin with a short introduction, followed by the main activities.",
        "After that, there will be time for questions and individual advice.",
        "It is important that you listen carefully and make notes as we go along.",
        "The schedule has been designed to give you enough time to understand each step.",
        "If at any point you feel confused, please remember your questions for the end.",
        "Finally, I will summarise the key points and remind you of the next meeting.",
        "By the end of this session, you should feel more confident about the process.",
        "Thank you for your attention. Now let us start with the first part.",
    ]

    transcript = [{"speaker": speaker, "text": t} for t in lines]

    questions = [
        {
            "id": 1,
            "type": "multiple_choice",
            "question_type": "listening_multiple_choice",
            "question": "What is the main focus of the talk?",
            "options": [
                "A. Explaining the plan and stages",
                "B. Giving detailed history",
                "C. Discussing personal stories",
            ],
            "correct_answer": "A. Explaining the plan and stages",
        },
        {
            "id": 2,
            "type": "short_answer",
            "question_type": "listening_short_answer",
            "question": "What should participants do while listening?",
            "correct_answer": "make notes",
        },
        {
            "id": 3,
            "type": "sentence_completion",
            "question_type": "listening_sentence_completion",
            "question": "At the end, the speaker will __________ the key points.",
            "correct_answer": "summarise",
        },
        {
            "id": 4,
            "type": "true_false_not_given",
            "question_type": "listening_true_false_not_given",
            "question": "There will be no time for questions.",
            "options": ["True", "False", "Not Given"],
            "correct_answer": "False",
        },
        {
            "id": 5,
            "type": "short_answer",
            "question_type": "listening_short_answer",
            "question": "How should participants feel by the end of the session?",
            "correct_answer": "more confident",
        },
    ]

    return {
        "id": section_id,
        "title": title,
        "instructions": instructions,
        "audio_transcript": transcript,
        "questions": questions,
    }


def generate_listening_test(level: Level) -> Dict[str, Any]:
    """
    Generate a 4-section listening test (20 questions total).
    Sections 1 & 3 are dialogues; 2 & 4 are monologues.
    """
    # Rough difficulty mapping to control topics/phrasing very lightly
    difficulty_map = {
        Level.BEGINNER: 1,
        Level.ELEMENTARY: 1,
        Level.INTERMEDIATE: 2,
        Level.UPPER_INTERMEDIATE: 2,
        Level.ADVANCED: 3,
    }
    base = difficulty_map.get(level, 2)

    sections: List[Dict[str, Any]] = []

    sections.append(
        _dialogue_section(
            section_id=1,
            title="Booking Information",
            instructions="You will hear a conversation. Answer the questions as you listen.",
            base_difficulty=base,
        )
    )

    sections.append(
        _monologue_section(
            section_id=2,
            title="Orientation Talk",
            instructions="You will hear a talk. Answer the questions as you listen.",
            base_difficulty=base,
        )
    )

    sections.append(
        _dialogue_section(
            section_id=3,
            title="Study Consultation",
            instructions="You will hear a discussion between a student and an advisor.",
            base_difficulty=base + 1,
        )
    )

    sections.append(
        _monologue_section(
            section_id=4,
            title="Short Lecture",
            instructions="You will hear part of a lecture. Answer the questions.",
            base_difficulty=base + 1,
        )
    )

    return {"sections": sections}


