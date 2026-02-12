from typing import Any, Dict

from ..models import Level
from .test_generator_reading import _base_chart_data


def generate_writing_test(level: Level) -> Dict[str, Any]:
    """
    Generate TWO writing tasks:
    - Task 1: Short chart description linked to Reading Passage 1 style
    - Task 2: Essay on a social / educational issue
    """
    chart_data = _base_chart_data()
    chart_description = (
        "The chart compares weekly study time for four English skills: "
        "listening, speaking, reading and writing."
    )

    task1_instructions = (
        "Summarise the information by selecting and reporting the main features "
        "of the chart about weekly study time, and make comparisons where relevant."
    )

    if level in {Level.BEGINNER, Level.ELEMENTARY}:
        essay_type = "opinion"
        question = (
            "Some people think studying English online is better than studying in a "
            "traditional classroom. Do you agree or disagree?"
        )
    elif level in {Level.INTERMEDIATE, Level.UPPER_INTERMEDIATE}:
        essay_type = "advantages_disadvantages"
        question = (
            "More and more learners choose online English courses instead of face‑to‑face "
            "classes. What are the advantages and disadvantages of this trend?"
        )
    else:
        essay_type = "discussion"
        question = (
            "Many universities now offer blended English courses that combine online study "
            "with classroom teaching. Discuss both the advantages and disadvantages of this "
            "approach and give your own opinion."
        )

    task1 = {
        "instructions": task1_instructions,
        "chart_data": chart_data,
        "chart_description": chart_description,
        "min_words": 50,
        "max_words": 80,
        "linked_to_passage": 1,
    }

    task2 = {
        "question": question,
        "min_words": 100,
        "max_words": 120,
        "essay_type": essay_type,
        "linked_to_passage": 2,
    }

    return {"task1": task1, "task2": task2}


