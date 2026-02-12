from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import tests


def create_app() -> FastAPI:
    app = FastAPI(
        title="Glocal IELTS Diagnostic Engine",
        version="1.0.0",
        description=(
            "IELTS test generation, scoring, and analysis engine. "
            "Each request handles exactly ONE skill (Listening, Speaking, Reading, Writing)."
        ),
    )

    # Allow local dev frontends by default
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(tests.router, prefix="/api")
    return app


app = create_app()


