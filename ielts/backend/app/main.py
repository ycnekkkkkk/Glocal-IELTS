from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes.test_session import router
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IELTS Test API",
    description="IELTS Test API with Gemini AI",
    version="1.0.0",
)

# CORS middleware
allow_all_origins = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"
cors_origins = (
    os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
)
default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
allowed_origins = [
    origin.strip() for origin in cors_origins + default_origins if origin.strip()
]

if allow_all_origins or (not allowed_origins):
    logger.info("CORS: Allowing all origins")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    logger.info(f"CORS: Allowing specific origins: {allowed_origins}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

app.include_router(router, prefix="/api", tags=["test-session"])


@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    """Handle OPTIONS requests explicitly as fallback"""
    origin = request.headers.get("origin", "")
    logger.info(f"OPTIONS request to /{full_path} from origin: {origin}")

    if allow_all_origins or not allowed_origins:
        allowed_origin = "*"
    elif origin and origin in allowed_origins:
        allowed_origin = origin
    else:
        allowed_origin = allowed_origins[0] if allowed_origins else "*"

    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        },
    )


@app.get("/")
def read_root():
    return {"message": "IELTS Test API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
