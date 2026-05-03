"""
AI-Powered Video Loan Onboarding System
Main FastAPI Application

Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models.database import init_db
from routes.session import router as session_router
from routes.kyc import router as kyc_router
from routes.loan import router as loan_router
from routes.refer import router as refer_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*60)
    print("  AI Video Loan Onboarding System")
    print("  RBI Digital Lending Directions 2025 Compliant")
    print("="*60)
    init_db()

    # Preload Facenet512 weights at startup in a background thread.
    # This fixes the "loading longer to match" issue — model is ready
    # before the first real face-match request arrives.
    try:
        from services.face_service import warm_up
        warm_up()
    except Exception as e:
        print(f"[App] Face model preload skipped: {e}")

    print("[App] All services ready. Visit http://localhost:8000/docs")
    print("="*60 + "\n")
    yield
    # Shutdown
    print("[App] Shutting down...")


app = FastAPI(
    title="AI Video Loan Onboarding",
    description=(
        "End-to-end AI-powered loan origination system. "
        "Replaces manual KYC with video-based identity verification, "
        "real-time speech-to-text, and automated risk assessment "
        "per RBI Digital Lending Directions 2025."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(session_router)
app.include_router(kyc_router)
app.include_router(loan_router)
app.include_router(refer_router)


@app.get("/")
def root():
    return {
        "service": "AI Video Loan Onboarding",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok",
        "compliance": "RBI Digital Lending Directions 2025"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}