from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from ..models import Skill
from ..schemas import (
    TestGenerationRequest,
    TestGenerationResponse,
    ScoreRequest,
    ScoreResponse,
)
from ..services.scoring_service import ScoringService
from ..services.test_generator import TestGeneratorService
from ..services.overall_diagnosis_service import OverallDiagnosisService


router = APIRouter(prefix="/tests", tags=["tests"])

generator = TestGeneratorService()
scorer = ScoringService()
diagnosis_service = OverallDiagnosisService()


class OverallDiagnosisRequest(BaseModel):
    test_id: str
    level: str
    skill_results: Dict[str, Any]


@router.post("/generate", response_model=TestGenerationResponse)
def generate_test(payload: TestGenerationRequest) -> TestGenerationResponse:
    """
    Generate ONE IELTS-style test skill at a time.
    - Uses level to control topic complexity and expectations.
    - Returns content ready for web delivery.
    """
    content: Dict[str, Any] = generator.generate(payload.level, payload.skill)
    return TestGenerationResponse(level=payload.level, skill=payload.skill, content=content)


@router.post("/score", response_model=ScoreResponse)
def score_test(payload: ScoreRequest) -> ScoreResponse:
    """
    Score ONE skill and return detailed per-skill analysis.
    Listening/Reading: answer-key based + band conversion.
    Speaking/Writing: rubric-based bands + extended language analysis.
    """
    skill = payload.skill
    content = {skill.value: payload.content.get(skill.value, payload.content)}
    scores: Dict[str, Any] = scorer.score_skill(skill, content, payload.answers)

    band: float
    if skill in {Skill.LISTENING, Skill.READING}:
        band = scores.get("band", 0.0)
    else:
        band = scores.get("overall_band", 0.0)

    return ScoreResponse(
        level=payload.level,
        skill=skill,
        band=band,
        details=scores,
    )


@router.post("/overall-diagnosis")
def generate_overall_diagnosis(payload: OverallDiagnosisRequest) -> Dict[str, Any]:
    """
    Generate comprehensive overall IELTS diagnosis after completing all 4 skills.
    Returns: Overall Band + detailed analysis + strengths/weaknesses + improvement roadmap.
    """
    diagnosis = diagnosis_service.generate_overall_diagnosis(
        test_id=payload.test_id,
        level=payload.level,
        skill_results=payload.skill_results,
    )
    return diagnosis


