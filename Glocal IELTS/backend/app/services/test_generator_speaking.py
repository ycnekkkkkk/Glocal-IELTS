from typing import Dict, Any, List

from ..models import Level


def generate_speaking_test(level: Level) -> Dict[str, Any]:
    """
    Generate a full 3-part IELTS-style speaking test.
    Content is lightly adapted by level (more concrete for lower levels,
    more abstract and analytical for higher levels).
    """
    if level in {Level.BEGINNER, Level.ELEMENTARY}:
        part1_topics = ["hometown", "daily routine", "free time"]
        cue_topic = "a day you enjoyed recently"
        part3_theme = "free time and daily life"
    elif level in {Level.INTERMEDIATE, Level.UPPER_INTERMEDIATE}:
        part1_topics = ["studies or work", "technology", "travel"]
        cue_topic = "a useful piece of technology you often use"
        part3_theme = "technology and modern life"
    else:
        part1_topics = ["education", "society", "global issues"]
        cue_topic = "a social problem in your city or country"
        part3_theme = "social change and responsibility"

    part1: List[Dict[str, Any]] = []
    qid = 1
    for topic in part1_topics:
        part1.append(
            {
                "id": qid,
                "question": f"Let us talk about your {topic}. Can you describe it briefly?",
                "time_limit": 20,
            }
        )
        qid += 1

    part2 = {
        "topic": cue_topic,
        "task_card": (
            f"Describe {cue_topic}.\n"
            "You should say:\n"
            "- when it was\n"
            "- where it happened\n"
            "- who was involved\n"
            "and explain why it was important for you."
        ),
        "preparation_time": 60,
        "speaking_time": 120,
    }

    part3: List[Dict[str, Any]] = []
    part3_questions = [
        f"In your opinion, how has {part3_theme} changed in the last ten years?",
        f"Do you think these changes are mostly positive or negative? Why?",
        f"How might {part3_theme} be different in the future?",
    ]
    if level in {Level.UPPER_INTERMEDIATE, Level.ADVANCED}:
        part3_questions.append(
            f"What responsibilities do governments and individuals have in relation to {part3_theme}?"
        )

    for i, q in enumerate(part3_questions, start=1):
        part3.append({"id": i, "question": q, "time_limit": 30})

    return {"part1": part1, "part2": part2, "part3": part3}


