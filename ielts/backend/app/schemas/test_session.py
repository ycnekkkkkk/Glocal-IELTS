from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.test_session import Level, Phase, SessionStatus


class SessionCreate(BaseModel):
    level: Level


class PhaseSelection(BaseModel):
    phase: Phase


class AnswersSubmit(BaseModel):
    answers: Dict[str, Any]


class SessionResponse(BaseModel):
    id: int
    level: str
    selected_phase: Optional[str]
    status: str
    phase1_content: Optional[Dict[str, Any]]
    phase2_content: Optional[Dict[str, Any]]
    phase1_answers: Optional[Dict[str, Any]]
    phase2_answers: Optional[Dict[str, Any]]
    phase1_scores: Optional[Dict[str, Any]]
    phase2_scores: Optional[Dict[str, Any]]
    final_results: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    phase1_started_at: Optional[datetime]
    phase1_completed_at: Optional[datetime]
    phase2_started_at: Optional[datetime]
    phase2_completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SessionStatusResponse(BaseModel):
    id: int
    status: str
    level: str
    selected_phase: Optional[str]
    phase1_available: bool
    phase2_available: bool
    phase1_completed: bool
    phase2_completed: bool
