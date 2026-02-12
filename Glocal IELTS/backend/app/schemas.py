from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .models import Level, Skill


class TestGenerationRequest(BaseModel):
    level: Level
    skill: Skill


class ListeningAudioLine(BaseModel):
    speaker: str = Field(pattern="^(male|female)$")
    text: str


class ListeningQuestion(BaseModel):
    id: int
    type: str = Field(
        description="IELTS listening question type, e.g. multiple_choice, matching, short_answer, sentence_completion, true_false_not_given"
    )
    question: str
    options: Optional[List[str]] = None
    items: Optional[List[str]] = None
    correct_answer: str
    question_type: str


class ListeningSection(BaseModel):
    id: int
    title: str
    instructions: str
    audio_transcript: List[ListeningAudioLine]
    questions: List[ListeningQuestion]


class ListeningTest(BaseModel):
    sections: List[ListeningSection]


class SpeakingQuestion(BaseModel):
    id: int
    question: str
    time_limit: int


class SpeakingPart2(BaseModel):
    topic: str
    task_card: str
    preparation_time: int
    speaking_time: int


class SpeakingTest(BaseModel):
    part1: List[SpeakingQuestion]
    part2: SpeakingPart2
    part3: List[SpeakingQuestion]


class ChartData(BaseModel):
    type: str
    title: str
    labels: List[str]
    data: List[float]
    xAxis: str
    yAxis: str


class ReadingQuestion(BaseModel):
    id: int
    type: str
    question: str
    options: Optional[List[str]] = None
    items: Optional[List[str]] = None
    correct_answer: str
    question_type: str


class ReadingPassage(BaseModel):
    id: int
    title: str
    content: str
    chart_data: Optional[ChartData] = None
    chart_description: Optional[str] = None
    questions: List[ReadingQuestion]


class ReadingTest(BaseModel):
    passages: List[ReadingPassage]


class WritingTask1(BaseModel):
    instructions: str
    chart_data: Optional[ChartData] = None
    chart_description: Optional[str] = None
    min_words: int
    max_words: int
    linked_to_passage: int


class WritingTask2(BaseModel):
    question: str
    min_words: int
    max_words: int
    essay_type: str
    linked_to_passage: int


class WritingTest(BaseModel):
    task1: WritingTask1
    task2: WritingTask2


class TestGenerationResponse(BaseModel):
    level: Level
    skill: Skill
    content: Dict[str, Any]


class TestAnswers(BaseModel):
    # Flexible map: frontend keys follow naming convention per skill
    answers: Dict[str, Any]


class ListeningScoreResult(BaseModel):
    raw_score: int
    total_questions: int
    band: float
    detailed_results: List[Dict[str, Any]]
    question_type_analysis: Dict[str, Any]


class ReadingScoreResult(ListeningScoreResult):
    pass


class SpeakingScoreResult(BaseModel):
    fluency_coherence: float
    lexical_resource: float
    grammatical_range: float
    pronunciation: float
    overall_band: float
    feedback: str
    extended_analysis: Dict[str, Any]


class WritingTaskScore(BaseModel):
    task_achievement: Optional[float] = None
    task_response: Optional[float] = None
    coherence_cohesion: float
    lexical_resource: float
    grammatical_range: float
    overall_band: float


class WritingScoreResult(BaseModel):
    task1: Optional[WritingTaskScore] = None
    task2: WritingTaskScore
    overall_band: float
    feedback: str
    extended_analysis: Dict[str, Any]


class ScoreRequest(BaseModel):
    level: Level
    skill: Skill
    content: Dict[str, Any]
    answers: Dict[str, Any]


class ScoreResponse(BaseModel):
    level: Level
    skill: Skill
    band: float
    details: Dict[str, Any]
