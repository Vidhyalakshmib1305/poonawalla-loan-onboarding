# ── Poonawalla Fincorp — Backend Dockerfile ──────────────────────────────
# Python 3.11 slim base — smaller image than full python:3.11
FROM python:3.11-slim

LABEL maintainer="Poonawalla Fincorp Tech"
LABEL description="AI Video KYC Loan Onboarding — FastAPI Backend"

# ── System dependencies ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── App directory ─────────────────────────────────────────────────────────
WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Download Whisper model at build time (avoids runtime delay) ───────────
RUN python -c "import whisper; whisper.load_model('base')"

# ── Pre-download DeepFace Facenet512 weights at build time ────────────────
RUN python -c "\
from deepface import DeepFace; \
import numpy as np; \
dummy = np.zeros((224,224,3), dtype=np.uint8); \
import cv2; \
import tempfile, os; \
tmp = tempfile.mktemp(suffix='.jpg'); \
cv2.imwrite(tmp, dummy); \
try: DeepFace.represent(tmp, model_name='Facenet512', enforce_detection=False); \
except: pass; \
os.unlink(tmp); \
print('[Docker] Facenet512 weights preloaded')" || echo "[Docker] DeepFace preload skipped"

# ── Copy application code ─────────────────────────────────────────────────
COPY . .

# ── Data directory for SQLite ─────────────────────────────────────────────
RUN mkdir -p /app/data && chmod 755 /app/data

# ── Environment defaults ──────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV WHISPER_MODEL=base
ENV TF_ENABLE_ONEDNN_OPTS=0
ENV DATABASE_PATH=/app/data/audit.db
ENV TESSERACT_PATH=/usr/bin/tesseract
ENV POPPLER_PATH=/usr/bin

# ── Health check ──────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=90s \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--timeout-keep-alive", "75"]
