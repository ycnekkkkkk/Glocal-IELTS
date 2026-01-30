from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, Any

from app.storage import storage
from app.models.test_session import Level, Phase, SessionStatus
from app.schemas.test_session import (
    SessionCreate,
    SessionResponse,
    PhaseSelection,
    AnswersSubmit,
    SessionStatusResponse,
)
from app.services.test_generator import TestGeneratorService
from app.services.scoring_service import ScoringService

router = APIRouter()

test_generator = TestGeneratorService()
scoring_service = ScoringService()


@router.post("/sessions", response_model=SessionResponse)
def create_session(session_data: SessionCreate):
    """1. Initialize: Create test_session with level"""
    session = storage.create_session(session_data.level)
    return SessionResponse(**session)


@router.post("/sessions/{session_id}/select-phase", response_model=SessionResponse)
def select_phase(session_id: int, phase_data: PhaseSelection):
    """2. Select phase: User chooses phase (Listening & Speaking or Reading & Writing)"""
    session = storage.get_session(session_id)
    if not session:
        print(
            f"Session {session_id} not found. Available sessions: {list(storage.sessions.keys())}"
        )
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if session["status"] != SessionStatus.INITIALIZED:
        raise HTTPException(status_code=400, detail="Phase already selected")

    session = storage.update_session(
        session_id,
        selected_phase=phase_data.phase,
        status=SessionStatus.PHASE1_SELECTED,
    )
    return SessionResponse(**session)


@router.post("/sessions/{session_id}/generate", response_model=SessionResponse)
def generate_phase_content(session_id: int):
    """3. Generate test: Create test for selected phase (call AI once)"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session["selected_phase"]:
        raise HTTPException(status_code=400, detail="Please select a phase first")

    if session["phase1_content"]:
        return SessionResponse(**session)

    try:
        print(
            f"Generating content for session {session_id}, phase: {session['selected_phase']}, level: {session['level']}"
        )
        if session["selected_phase"] == Phase.LISTENING_SPEAKING:
            content = test_generator.generate_listening_speaking(session["level"])
        elif session["selected_phase"] == Phase.READING_WRITING:
            content = test_generator.generate_reading_writing(session["level"])
        else:
            raise HTTPException(status_code=400, detail="Invalid phase")

        print(f"Content generated and validated successfully for session {session_id}")
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e)
        error_lower = error_str.lower()
        
        # Handle quota/rate limit errors specifically
        if "429" in error_str or "quota" in error_lower or "rate limit" in error_lower or "ResourceExhausted" in str(type(e).__name__):
            print(f"❌ Quota/Rate limit error for session {session_id}: {error_str}")
            # Extract retry delay if available
            retry_delay = None
            if "retry in" in error_lower or "retry_delay" in error_lower:
                import re
                delay_match = re.search(r'retry in ([\d.]+)\s*(ms|s|seconds?)', error_lower)
                if delay_match:
                    retry_delay = delay_match.group(1)
            
            detail_msg = "API quota exceeded. Please wait a few minutes and try again."
            if retry_delay:
                detail_msg += f" Suggested retry delay: {retry_delay}ms"
            
            raise HTTPException(
                status_code=429,
                detail=detail_msg
            )
        # Re-raise other exceptions
        raise

    # Continue with validation and response creation (outside try-except)
    if not isinstance(content, dict):
        raise HTTPException(
            status_code=500,
            detail=f"Generated content is not a dict: {type(content)}",
        )

    session = storage.update_session(
        session_id, phase1_content=content, status=SessionStatus.PHASE1_GENERATED
    )
    if not session:
        raise HTTPException(
            status_code=500, detail="Failed to update session in storage"
        )

    try:
        return SessionResponse(**session)
    except Exception as e:
        print(f"Error creating SessionResponse: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error creating response: {str(e)}"
        )
        import traceback

        error_details = traceback.format_exc()
        print(f"Generation error for session {session_id}: {error_details}")
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: int):
    """Get session information"""
    session = storage.get_session(session_id)
    if not session:
        print(
            f"Session {session_id} not found. Available sessions: {list(storage.sessions.keys())}"
        )
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )
    return SessionResponse(**session)


@router.post("/sessions/{session_id}/start-phase1")
def start_phase1(session_id: int):
    """Start phase 1"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if not session["phase1_content"]:
        raise HTTPException(status_code=400, detail="Phase 1 content not generated")

    storage.update_session(
        session_id,
        status=SessionStatus.PHASE1_IN_PROGRESS,
        phase1_started_at=datetime.now(),
    )
    return {"message": "Phase 1 started", "session_id": session_id}


@router.post("/sessions/{session_id}/submit-phase1", response_model=SessionResponse)
def submit_phase1(session_id: int, answers: AnswersSubmit):
    """5. Submit phase 1: AI scores and saves results"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if not session["phase1_content"]:
        raise HTTPException(status_code=400, detail="Phase 1 content not generated")

    try:
        scores = {}
        print(
            f"Starting scoring for phase 1, selected_phase: {session['selected_phase']}"
        )

        if session["selected_phase"] == Phase.LISTENING_SPEAKING:
            print("Scoring Listening & Speaking...")
            scores["listening"] = scoring_service.score_listening(
                session["phase1_content"], answers.answers
            )
            print("Listening scored, starting Speaking...")
            scores["speaking"] = scoring_service.score_speaking(
                session["phase1_content"], answers.answers
            )
            print("Speaking scored")
        elif session["selected_phase"] == Phase.READING_WRITING:
            print("Scoring Reading & Writing...")
            scores["reading"] = scoring_service.score_reading(
                session["phase1_content"], answers.answers
            )
            print("Reading scored, starting Writing...")
            scores["writing"] = scoring_service.score_writing(
                session["phase1_content"], answers.answers
            )
            print("Writing scored")

        session = storage.update_session(
            session_id,
            phase1_answers=answers.answers,
            phase1_completed_at=datetime.now(),
            phase1_scores=scores,
            status=SessionStatus.PHASE1_COMPLETED,
        )
        print(f"Phase 1 scoring completed successfully")
        return SessionResponse(**session)
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        print(f"Scoring error: {error_details}")
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


@router.post("/sessions/{session_id}/generate-phase2", response_model=SessionResponse)
def generate_phase2(session_id: int):
    """6. Generate phase 2: Create test for remaining phase"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if session["status"] != SessionStatus.PHASE1_COMPLETED:
        raise HTTPException(status_code=400, detail="Please complete phase 1 first")

    if session["phase2_content"]:
        return SessionResponse(**session)

    phase2_type = (
        Phase.READING_WRITING
        if session["selected_phase"] == Phase.LISTENING_SPEAKING
        else Phase.LISTENING_SPEAKING
    )

    try:
        if phase2_type == Phase.LISTENING_SPEAKING:
            content = test_generator.generate_listening_speaking(session["level"])
        else:
            content = test_generator.generate_reading_writing(session["level"])

        print(
            f"Phase 2 content generated and validated successfully for session {session_id}"
        )

        session = storage.update_session(
            session_id, phase2_content=content, status=SessionStatus.PHASE2_GENERATED
        )
        return SessionResponse(**session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.post("/sessions/{session_id}/start-phase2")
def start_phase2(session_id: int):
    """Start phase 2"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if not session["phase2_content"]:
        raise HTTPException(status_code=400, detail="Phase 2 content not generated")

    storage.update_session(
        session_id,
        status=SessionStatus.PHASE2_IN_PROGRESS,
        phase2_started_at=datetime.now(),
    )
    return {"message": "Phase 2 started", "session_id": session_id}


@router.post("/sessions/{session_id}/submit-phase2", response_model=SessionResponse)
def submit_phase2(session_id: int, answers: AnswersSubmit):
    """7. Submit phase 2: AI scores phase 2"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if not session["phase2_content"]:
        raise HTTPException(status_code=400, detail="Phase 2 content not generated")

    try:
        scores = {}
        phase2_type = (
            Phase.READING_WRITING
            if session["selected_phase"] == Phase.LISTENING_SPEAKING
            else Phase.LISTENING_SPEAKING
        )

        if phase2_type == Phase.LISTENING_SPEAKING:
            scores["listening"] = scoring_service.score_listening(
                session["phase2_content"], answers.answers
            )
            scores["speaking"] = scoring_service.score_speaking(
                session["phase2_content"], answers.answers
            )
        else:
            scores["reading"] = scoring_service.score_reading(
                session["phase2_content"], answers.answers
            )
            scores["writing"] = scoring_service.score_writing(
                session["phase2_content"], answers.answers
            )

        session = storage.update_session(
            session_id,
            phase2_answers=answers.answers,
            phase2_completed_at=datetime.now(),
            phase2_scores=scores,
            status=SessionStatus.PHASE2_COMPLETED,
        )
        return SessionResponse(**session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


@router.post("/sessions/{session_id}/aggregate", response_model=SessionResponse)
def aggregate_results(session_id: int):
    """8. Aggregate results: Calculate IELTS equivalent and analysis"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    if session["status"] != SessionStatus.PHASE2_COMPLETED:
        raise HTTPException(status_code=400, detail="Please complete both phases first")

    if session["final_results"]:
        return SessionResponse(**session)

    phase2_type = (
        Phase.READING_WRITING
        if session["selected_phase"] == Phase.LISTENING_SPEAKING
        else Phase.LISTENING_SPEAKING
    )

    final_results = scoring_service.aggregate_results(
        session["phase1_scores"] or {},
        session["phase2_scores"] or {},
        session["selected_phase"],
        phase2_type,
    )

    try:
        print("Generating detailed analysis...")
        detailed_analysis = scoring_service.generate_detailed_analysis(
            session["phase1_scores"] or {},
            session["phase2_scores"] or {},
            session["selected_phase"],
            phase2_type,
            session["phase1_content"] or {},
            session["phase2_content"] or {},
            session["phase1_answers"] or {},
            session["phase2_answers"] or {},
            final_results,
        )
        final_results["detailed_analysis"] = detailed_analysis
        print("Detailed analysis generated successfully")
    except Exception as e:
        print(f"Error generating detailed analysis (non-critical): {e}")
        final_results["detailed_analysis"] = {
            "ielts_analysis": {},
            "extended_analysis": {},
        }

    session = storage.update_session(
        session_id, final_results=final_results, status=SessionStatus.COMPLETED
    )
    return SessionResponse(**session)


@router.get("/sessions/{session_id}/status", response_model=SessionStatusResponse)
def get_session_status(session_id: int):
    """Get session status"""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found. Please create a new session.",
        )

    return SessionStatusResponse(
        id=session["id"],
        status=session["status"],
        level=session["level"],
        selected_phase=session["selected_phase"],
        phase1_available=session["phase1_content"] is not None,
        phase2_available=session["phase2_content"] is not None,
        phase1_completed=session["phase1_scores"] is not None,
        phase2_completed=session["phase2_scores"] is not None,
    )


@router.get("/sessions", response_model=list)
def list_sessions():
    """List all sessions (for debugging)"""
    return storage.get_all_sessions()
