from enum import Enum


class Level(str, Enum):
    BEGINNER = "beginner"  # IELTS 3.0-4.0
    ELEMENTARY = "elementary"  # IELTS 4.0-4.5
    INTERMEDIATE = "intermediate"  # IELTS 5.0-5.5
    UPPER_INTERMEDIATE = "upper_intermediate"  # IELTS 6.0-6.5
    ADVANCED = "advanced"  # IELTS 7.5-8.0


class Phase(str, Enum):
    LISTENING_SPEAKING = "listening_speaking"
    READING_WRITING = "reading_writing"


class SessionStatus(str, Enum):
    INITIALIZED = "initialized"
    PHASE1_SELECTED = "phase1_selected"
    PHASE1_GENERATED = "phase1_generated"
    PHASE1_IN_PROGRESS = "phase1_in_progress"
    PHASE1_COMPLETED = "phase1_completed"
    PHASE2_GENERATED = "phase2_generated"
    PHASE2_IN_PROGRESS = "phase2_in_progress"
    PHASE2_COMPLETED = "phase2_completed"
    COMPLETED = "completed"

