"""
Whisper STT Service — transcribes audio from video call.
Uses openai-whisper running locally (free, no API key needed).
Supports chunked streaming transcription for real-time feel.
"""

import whisper
import tempfile
import os
import numpy as np
from pathlib import Path

# Load model once at startup — "base" is fast enough for demo, "small" for better accuracy
# Options: tiny, base, small, medium, large
MODEL_NAME = os.getenv("WHISPER_MODEL", "base")

_model = None


def get_model():
    global _model
    if _model is None:
        print(f"[Whisper] Loading model '{MODEL_NAME}'...")
        _model = whisper.load_model(MODEL_NAME)
        print(f"[Whisper] Model loaded.")
    return _model


def transcribe_audio_file(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe a complete audio file (WAV or WebM bytes).
    Returns dict with transcript text and detected language.
    """
    model = get_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(
            tmp_path,
            language=language,
            task="transcribe",
            fp16=False,          # CPU safe
            verbose=False,
        )
        return {
            "text": result["text"].strip(),
            "language": result.get("language", language),
            "segments": [
                {
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"].strip()
                }
                for s in result.get("segments", [])
            ]
        }
    except Exception as e:
        print(f"[Whisper] Transcription error: {e}")
        return {"text": "", "language": language, "segments": [], "error": str(e)}
    finally:
        os.unlink(tmp_path)


def transcribe_audio_chunk(chunk_bytes: bytes, language: str = "en") -> str:
    """
    Transcribe a short audio chunk (for streaming/real-time display).
    Returns just the text string.
    """
    result = transcribe_audio_file(chunk_bytes, language)
    return result.get("text", "")


def merge_transcripts(segments: list[str]) -> str:
    """Merge multiple chunk transcripts into one clean transcript."""
    merged = " ".join(s.strip() for s in segments if s.strip())
    # Basic cleanup — remove duplicate spaces
    while "  " in merged:
        merged = merged.replace("  ", " ")
    return merged.strip()
