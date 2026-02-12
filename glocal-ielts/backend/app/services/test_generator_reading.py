from typing import Any, Dict, List

from ..models import Level


def _base_chart_data() -> Dict[str, Any]:
    return {
        "type": "bar",
        "title": "Weekly Time Spent on English Study by Skill",
        "labels": ["Listening", "Speaking", "Reading", "Writing"],
        "data": [3, 2.5, 2, 1.5],
        "xAxis": "Skill",
        "yAxis": "Hours per week",
    }


def _passage1(level: Level) -> Dict[str, Any]:
    chart = _base_chart_data()
    content_parts: List[str] = [
        "The chart shows the average number of hours that a group of adult learners spend on four English skills each week.",
        "Listening receives the greatest amount of time, with learners spending around three hours per week on this skill.",
        "Speaking is the second most practised skill, at about two and a half hours.",
        "Reading and writing take slightly less time, with two hours and one and a half hours respectively.",
        "These figures suggest that many learners prefer receptive skills such as listening, perhaps because they can practise them while travelling or relaxing at home.",
        "In contrast, productive skills, especially writing, may require more focus, planning and feedback from a teacher.",
    ]
    if level in {Level.UPPER_INTERMEDIATE, Level.ADVANCED}:
        content_parts.append(
            "Overall, the distribution of study time reflects both learner preferences and perceived difficulty, as students may avoid activities that feel demanding or time‑consuming."
        )

    content = " ".join(content_parts)

    chart_description = (
        "Learners spend about 3 hours on listening, 2.5 hours on speaking, "
        "2 hours on reading and 1.5 hours on writing each week."
    )

    questions: List[Dict[str, Any]] = [
        {
            "id": 1,
            "type": "multiple_choice",
            "question_type": "reading_multiple_choice",
            "question": "Which skill receives the most study time?",
            "options": [
                "A. Speaking",
                "B. Listening",
                "C. Reading",
                "D. Writing",
            ],
            "correct_answer": "B. Listening",
        },
        {
            "id": 2,
            "type": "true_false_not_given",
            "question_type": "reading_true_false_not_given",
            "question": "Learners spend more time on reading than on speaking.",
            "options": ["True", "False", "Not Given"],
            "correct_answer": "False",
        },
        {
            "id": 3,
            "type": "yes_no_not_given",
            "question_type": "reading_yes_no_not_given",
            "question": "Does the passage suggest that writing is seen as demanding?",
            "options": ["Yes", "No", "Not Given"],
            "correct_answer": "Yes",
        },
        {
            "id": 4,
            "type": "matching_headings",
            "question_type": "reading_matching_headings",
            "question": "Match each paragraph with the correct heading.",
            "items": ["Paragraph 1", "Paragraph 2"],
            "options": [
                "i. An overview of the chart",
                "ii. Reasons for the pattern",
                "iii. Problems with the data",
            ],
            "correct_answer": "Paragraph 1:i, Paragraph 2:ii",
        },
        {
            "id": 5,
            "type": "matching_information",
            "question_type": "reading_matching_information",
            "question": "Which paragraph mentions each idea?",
            "items": ["Learners avoid demanding activities", "Time spent on each skill"],
            "options": ["A. First paragraph", "B. Second paragraph"],
            "correct_answer": "Learners avoid demanding activities:B, Time spent on each skill:A",
        },
        {
            "id": 6,
            "type": "sentence_completion",
            "question_type": "reading_sentence_completion",
            "question": "Learners spend around __________ hours per week on speaking.",
            "correct_answer": "two and a half",
        },
        {
            "id": 7,
            "type": "short_answer",
            "question_type": "reading_short_answer",
            "question": "Which skill is practised for the fewest hours?",
            "correct_answer": "writing",
        },
        {
            "id": 8,
            "type": "classification",
            "question_type": "reading_classification",
            "question": "Classify the skills as receptive or productive.",
            "items": ["Listening", "Speaking", "Reading", "Writing"],
            "options": ["A. Receptive", "B. Productive"],
            "correct_answer": "Listening:A, Speaking:B, Reading:A, Writing:B",
        },
        {
            "id": 9,
            "type": "multiple_choice",
            "question_type": "reading_multiple_choice_detail",
            "question": "Why might learners prefer listening practice?",
            "options": [
                "A. It is always more interesting.",
                "B. It can be combined with other activities.",
                "C. Teachers give more homework in listening.",
                "D. It is easier than speaking.",
            ],
            "correct_answer": "B. It can be combined with other activities.",
        },
        {
            "id": 10,
            "type": "short_answer",
            "question_type": "reading_short_answer_inference",
            "question": "Which skill may require more planning and feedback from a teacher?",
            "correct_answer": "writing",
        },
    ]

    return {
        "id": 1,
        "title": "Time Spent on English Skills",
        "content": content,
        "chart_data": chart,
        "chart_description": chart_description,
        "questions": questions,
    }


def _passage2(level: Level) -> Dict[str, Any]:
    paragraphs: List[str] = [
        "In many cities, people are now able to study English through online platforms instead of attending traditional classrooms.",
        "Supporters of online learning argue that it offers greater flexibility, allowing learners to choose when and where they study.",
        "They also point out that students can access a wide range of materials, from recorded lectures to interactive exercises.",
        "However, critics worry that studying alone in front of a screen may reduce opportunities for real communication.",
        "They claim that without regular face‑to‑face interaction, learners may struggle to develop natural speaking skills and confidence.",
    ]
    if level in {Level.UPPER_INTERMEDIATE, Level.ADVANCED}:
        paragraphs.append(
            "Despite these concerns, a growing number of universities now offer blended courses that combine online study with traditional seminars, hoping to provide the advantages of both models."
        )

    content = " ".join(paragraphs)

    questions: List[Dict[str, Any]] = [
        {
            "id": 1,
            "type": "multiple_choice",
            "question_type": "reading_multiple_choice_main_idea",
            "question": "What is the main focus of the passage?",
            "options": [
                "A. The cost of English courses",
                "B. The advantages and disadvantages of online English learning",
                "C. The history of English teaching",
                "D. The best age to learn English",
            ],
            "correct_answer": (
                "B. The advantages and disadvantages of online English learning"
            ),
        },
        {
            "id": 2,
            "type": "true_false_not_given",
            "question_type": "reading_true_false_not_given_opinion",
            "question": "Supporters of online learning believe it is more flexible than traditional classes.",
            "options": ["True", "False", "Not Given"],
            "correct_answer": "True",
        },
        {
            "id": 3,
            "type": "yes_no_not_given",
            "question_type": "reading_yes_no_not_given_author",
            "question": "Does the writer completely reject online learning?",
            "options": ["Yes", "No", "Not Given"],
            "correct_answer": "No",
        },
        {
            "id": 4,
            "type": "matching_headings",
            "question_type": "reading_matching_headings_abstract",
            "question": "Match each paragraph with the correct heading.",
            "items": ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
            "options": [
                "i. Concerns about communication",
                "ii. Growth of online platforms",
                "iii. Reasons learners choose online study",
            ],
            "correct_answer": "Paragraph 1:ii, Paragraph 2:iii, Paragraph 3:iii",
        },
        {
            "id": 5,
            "type": "matching_information",
            "question_type": "reading_matching_information_detail",
            "question": "Which paragraph mentions each idea?",
            "items": [
                "Lack of confidence in speaking",
                "Access to a wide range of materials",
            ],
            "options": ["A. Second paragraph", "B. Third paragraph", "C. Fourth paragraph"],
            "correct_answer": "Lack of confidence in speaking:C, Access to a wide range of materials:B",
        },
        {
            "id": 6,
            "type": "sentence_completion",
            "question_type": "reading_sentence_completion_inference",
            "question": "Critics are afraid that learners will have fewer chances for __________.",
            "correct_answer": "real communication",
        },
        {
            "id": 7,
            "type": "short_answer",
            "question_type": "reading_short_answer_detail",
            "question": "What kind of courses do many universities now offer?",
            "correct_answer": "blended courses",
        },
        {
            "id": 8,
            "type": "multiple_choice",
            "question_type": "reading_multiple_choice_inference",
            "question": "What can be inferred about blended courses?",
            "options": [
                "A. They are cheaper than traditional courses.",
                "B. They try to combine the strengths of different learning methods.",
                "C. They completely replace classroom teaching.",
                "D. They are unpopular with students.",
            ],
            "correct_answer": "B. They try to combine the strengths of different learning methods.",
        },
        {
            "id": 9,
            "type": "short_answer",
            "question_type": "reading_short_answer_opinion",
            "question": "According to critics, what may learners struggle to develop?",
            "correct_answer": "natural speaking skills",
        },
        {
            "id": 10,
            "type": "short_answer",
            "question_type": "reading_short_answer_vocabulary",
            "question": "Which word in the passage has a similar meaning to 'supporters'?",
            "correct_answer": "supporters",
        },
    ]

    return {
        "id": 2,
        "title": "Online English Learning",
        "content": content,
        "questions": questions,
    }


def generate_reading_test(level: Level) -> Dict[str, Any]:
    """
    Generate TWO passages (informational + social/societal) with
    20 questions across at least 10 IELTS reading question types.
    """
    p1 = _passage1(level)
    p2 = _passage2(level)
    return {"passages": [p1, p2]}


