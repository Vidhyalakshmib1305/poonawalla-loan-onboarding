"""
Document Verification Service
- PRIMARY:  Groq vision LLM (llama-4-scout-17b-16e-instruct) — accurate extraction
- FALLBACK: Tesseract OCR — if vision API fails
- Extracts: name, DOB, address, Aadhaar number, PAN number
- Extracts face photo from Aadhaar via OpenCV Haar cascade
- Masks Aadhaar number per UIDAI guidelines (last 4 digits only)

Production replacement: UIDAI eKYC API + CIBIL PAN verification
"""

import os
import re
import io
import json
import base64
import shutil
from datetime import date

import cv2
import numpy as np
from PIL import Image
import pytesseract
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ─── Groq Vision Client ───────────────────────────────────────────────────────
_groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# ─── Tesseract (fallback) ─────────────────────────────────────────────────────
_tess = (
    os.getenv("TESSERACT_PATH")
    or shutil.which("tesseract")
    or r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    or "/usr/bin/tesseract"
)
if _tess and os.path.exists(str(_tess)):
    pytesseract.pytesseract.tesseract_cmd = _tess

try:
    _langs = pytesseract.get_languages()
    OCR_LANG = "eng+hin" if "hin" in _langs else "eng"
except Exception:
    OCR_LANG = "eng"

print(f"[DOC] Vision model  : {VISION_MODEL}")
print(f"[DOC] Tesseract     : {pytesseract.pytesseract.tesseract_cmd}")
print(f"[DOC] OCR lang      : {OCR_LANG}")


# ─── Image Utilities ──────────────────────────────────────────────────────────

def _pdf_to_pil(image_bytes: bytes) -> Image.Image:
    """Convert first page of PDF to PIL Image."""
    from pdf2image import convert_from_bytes
    pages = convert_from_bytes(
        image_bytes,
        dpi=200,
        first_page=1,
        last_page=1,
        poppler_path=os.getenv("POPPLER_PATH") or None
    )
    if not pages:
        raise RuntimeError("PDF has no pages")
    return pages[0].convert("RGB")


def _bytes_to_pil(image_bytes: bytes) -> Image.Image:
    """Convert raw bytes (any format) to PIL Image."""
    is_pdf = image_bytes[:4] == b'%PDF'
    if is_pdf:
        return _pdf_to_pil(image_bytes)
    try:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Cannot decode image with PIL or OpenCV")
        return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def _pil_to_base64(pil_img: Image.Image, max_size: int = 1600) -> str:
    """
    Resize so longest side <= max_size, encode as base64 JPEG.
    Groq vision works best up to ~1600px.
    """
    w, h = pil_img.size
    if max(w, h) > max_size:
        scale = max_size / max(w, h)
        pil_img = pil_img.resize(
            (int(w * scale), int(h * scale)), Image.LANCZOS
        )
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ─── Groq Vision Prompts ──────────────────────────────────────────────────────

AADHAAR_PROMPT = """You are a document data extraction engine. Extract information from this Aadhaar card image.

Return ONLY valid JSON with exactly these fields. Use null for any field you cannot find clearly.
Do NOT guess or hallucinate values.

{
  "name": "full name EXACTLY as printed character by character — copy verbatim, do not autocorrect spelling",
  "dob": "DD/MM/YYYY format",
  "dob_day": integer or null,
  "dob_month": integer or null,
  "dob_year": integer or null,
  "gender": "MALE or FEMALE or TRANSGENDER or null",
  "aadhaar_number_masked": "show as XXXX XXXX followed by last 4 digits only",
  "address": "full address as printed on card",
  "parse_confidence": "high if 3+ fields found, medium if 2, low if 1, failed if 0"
}

Rules:
- Extract name in English only (ignore Hindi text)
- Copy name EXACTLY as printed — every letter matters, do not fix spelling
- Mask first 8 digits of Aadhaar, show last 4 only
- Return ONLY the JSON object, no explanation, no markdown fences"""

PAN_PROMPT = """You are a document data extraction engine. Extract information from this PAN card image.

Return ONLY valid JSON with exactly these fields. Use null for any field you cannot find clearly.
Do NOT guess or hallucinate values.

{
  "name": "account holder name in English only",
  "fathers_name": "father name in English only or null",
  "dob": "DD/MM/YYYY format",
  "dob_day": integer or null,
  "dob_month": integer or null,
  "dob_year": integer or null,
  "pan_number": "10-character PAN (5 letters + 4 digits + 1 letter)",
  "parse_confidence": "high if all 3 main fields found, medium if 2, low if 1, failed if 0"
}

Rules:
- PAN format: ABCDE1234F
- Extract names in English only
- Return ONLY the JSON object, no explanation, no markdown fences"""


# ─── Groq Vision Extraction ───────────────────────────────────────────────────

def _extract_with_vision(image_bytes: bytes, document_type: str) -> dict | None:
    """
    Send document image to Groq vision LLM and extract fields.
    Returns parsed dict or None on failure.
    """
    try:
        pil_img = _bytes_to_pil(image_bytes)
        b64_img = _pil_to_base64(pil_img)
        prompt  = AADHAAR_PROMPT if document_type == "aadhaar" else PAN_PROMPT

        response = _groq.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_img}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            temperature=0.0,
            max_tokens=600,
        )

        raw = response.choices[0].message.content.strip()
        print(f"[VISION] Raw response ({document_type}): {raw[:400]}")

        # Strip markdown fences if present
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        data["document_type"]      = document_type
        data["extraction_method"]  = "groq_vision"

        # Ensure all expected keys exist
        defaults_aadhaar = ["name", "dob", "dob_day", "dob_month", "dob_year",
                            "gender", "aadhaar_number_masked", "address", "parse_confidence"]
        defaults_pan     = ["name", "fathers_name", "dob", "dob_day", "dob_month",
                            "dob_year", "pan_number", "parse_confidence"]

        for key in (defaults_aadhaar if document_type == "aadhaar" else defaults_pan):
            data.setdefault(key, None)

        # Coerce numeric fields
        for field in ["dob_day", "dob_month", "dob_year"]:
            if data.get(field) is not None:
                try:
                    data[field] = int(data[field])
                except (ValueError, TypeError):
                    data[field] = None

        print(f"[VISION] name={data.get('name')}, dob={data.get('dob')}, "
              f"confidence={data.get('parse_confidence')}")
        return data

    except json.JSONDecodeError as e:
        print(f"[VISION] JSON parse error: {e} | raw: {raw[:200]}")
        return None
    except Exception as e:
        print(f"[VISION] Extraction failed: {e}")
        return None


# ─── Tesseract Fallback ───────────────────────────────────────────────────────

def _run_tesseract(image_bytes: bytes) -> str:
    """Run Tesseract on image, return raw text."""
    config = f"--oem 3 --psm 6 -l {OCR_LANG}"
    try:
        pil_img = _bytes_to_pil(image_bytes)
        w, h = pil_img.size
        scale = max(2.0, 2400.0 / max(w, h))
        pil_img = pil_img.resize(
            (int(w * scale), int(h * scale)), Image.LANCZOS
        )
        return pytesseract.image_to_string(pil_img, config=config)
    except Exception as e:
        print(f"[TESS] Failed: {e}")
        return ""


def _parse_aadhaar_tesseract(ocr_text: str) -> dict:
    result = {
        "document_type": "aadhaar", "extraction_method": "tesseract_fallback",
        "name": None, "dob": None, "dob_year": None, "dob_month": None,
        "dob_day": None, "gender": None, "aadhaar_number_masked": None,
        "address": None, "raw_text": ocr_text[:500], "parse_confidence": "low"
    }
    m = re.search(r'\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b', ocr_text)
    if m:
        raw = re.sub(r'[\s-]', '', m.group(1))
        result["aadhaar_number_masked"] = f"XXXX XXXX {raw[-4:]}"
    m = re.search(r'\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b', ocr_text)
    if m:
        try:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            date(y, mo, d)
            result.update({"dob": f"{d:02d}/{mo:02d}/{y}",
                           "dob_day": d, "dob_month": mo, "dob_year": y})
        except ValueError:
            pass
    m = re.search(r'\b(MALE|FEMALE|TRANSGENDER)\b', ocr_text, re.IGNORECASE)
    if m:
        result["gender"] = m.group(1).upper()
    skip = {"government","india","aadhaar","unique","identification",
            "authority","male","female","dob","year","birth","address","of","the"}
    for line in ocr_text.split("\n"):
        line = line.strip()
        if not line or re.search(r'\d', line):
            continue
        words = line.split()
        if any(w.lower() in skip for w in words):
            continue
        if 4 <= len(line) <= 50 and all(c.isalpha() or c.isspace() or c == '.' for c in line):
            result["name"] = line
            break
    score = sum([result["name"] is not None, result["dob"] is not None,
                 result["aadhaar_number_masked"] is not None])
    result["parse_confidence"] = {3:"high",2:"medium",1:"low",0:"failed"}[min(score,3)]
    return result


def _parse_pan_tesseract(ocr_text: str) -> dict:
    result = {
        "document_type": "pan", "extraction_method": "tesseract_fallback",
        "name": None, "fathers_name": None, "dob": None,
        "dob_year": None, "dob_month": None, "dob_day": None,
        "pan_number": None, "raw_text": ocr_text[:500], "parse_confidence": "low"
    }
    m = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', ocr_text.upper())
    if m:
        result["pan_number"] = m.group(1)
    m = re.search(r'\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b', ocr_text)
    if m:
        try:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            date(y, mo, d)
            result.update({"dob": f"{d:02d}/{mo:02d}/{y}",
                           "dob_day": d, "dob_month": mo, "dob_year": y})
        except ValueError:
            pass
    skip = {"income","tax","department","india","permanent",
            "account","number","card","of","govt","government"}
    name_lines = []
    for line in ocr_text.split("\n"):
        line = line.strip()
        if not line or re.search(r'\d', line):
            continue
        words = line.split()
        if any(w.lower() in skip for w in words):
            continue
        if 1 <= len(words) <= 6 and all(c.isalpha() or c.isspace() for c in line):
            name_lines.append(line)
    if name_lines:
        result["name"] = name_lines[0]
    if len(name_lines) >= 2:
        result["fathers_name"] = name_lines[1]
    score = sum([result["name"] is not None, result["dob"] is not None,
                 result["pan_number"] is not None])
    result["parse_confidence"] = {3:"high",2:"medium",1:"low",0:"failed"}[score]
    return result


# ─── Face Extraction ─────────────────────────────────────────────────────────

def _enhance_extracted_face(crop_bgr: np.ndarray, target_size: int = 224) -> np.ndarray:
    """
    Enhance extracted Aadhaar face crop before saving:
    1. Upscale to at least target_size (160px minimum for Facenet512)
    2. CLAHE on luminance — fixes dark/washed-out Aadhaar photos
    3. Unsharp mask — restores compression-lost sharpness
    """
    h, w = crop_bgr.shape[:2]

    # Upscale if too small
    if min(h, w) < target_size:
        scale = target_size / min(h, w)
        crop_bgr = cv2.resize(
            crop_bgr,
            (max(target_size, int(w * scale)), max(target_size, int(h * scale))),
            interpolation=cv2.INTER_LANCZOS4
        )

    # CLAHE on luminance
    lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    crop_bgr = cv2.cvtColor(cv2.merge([l_ch, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    # Unsharp mask
    blur = cv2.GaussianBlur(crop_bgr, (0, 0), sigmaX=2.0)
    crop_bgr = np.clip(cv2.addWeighted(crop_bgr, 1.4, blur, -0.4, 0), 0, 255).astype(np.uint8)

    return crop_bgr


def extract_face_from_aadhaar(image_bytes: bytes) -> bytes | None:
    """
    Extract and enhance face photo from Aadhaar card.

    Strategy 1: Haar cascade on the full card at multiple scales
    Strategy 2: Enhanced heuristic crops (Aadhaar face is always top-left)
    Then: Apply CLAHE + sharpening to the extracted face region

    The enhancement step is critical — it produces a higher-quality face
    image that matches better against live webcam frames in DeepFace,
    avoiding the need to lower the fraud threshold.
    """
    try:
        pil_img = _bytes_to_pil(image_bytes)
        w, h    = pil_img.size
        img_cv  = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        gray    = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Try detection at progressively looser settings
        crop_bgr = None
        for (scale, neighbors, min_sz) in [
            (1.05, 3, (30, 30)),
            (1.05, 2, (20, 20)),
            (1.03, 2, (15, 15)),
        ]:
            faces = cascade.detectMultiScale(
                gray, scaleFactor=scale, minNeighbors=neighbors, minSize=min_sz
            )
            if len(faces) > 0:
                x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
                pad = int(max(fw, fh) * 0.5)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(w, x + fw + pad)
                y2 = min(h, y + fh + pad)
                crop_bgr = img_cv[y1:y2, x1:x2]
                print(f"[FACE] Detected at ({x},{y}) size {fw}x{fh} scale={scale}")
                break

        if crop_bgr is None:
            # Heuristic: on a standard Aadhaar card (landscape),
            # the photo is in the left ~30% of the card, vertically centred
            print("[FACE] No face detected — using heuristic crop")
            x1 = 0
            y1 = int(h * 0.15)
            x2 = int(w * 0.32)
            y2 = int(h * 0.88)
            crop_bgr = img_cv[y1:y2, x1:x2]

        # Enhance the extracted face
        crop_bgr = _enhance_extracted_face(crop_bgr)

        _, buf = cv2.imencode(".jpg", crop_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
        face_bytes = buf.tobytes()

        print(f"[FACE] Extracted face size: {crop_bgr.shape[1]}x{crop_bgr.shape[0]}px, "
              f"{len(face_bytes)//1024}KB")
        return face_bytes

    except Exception as e:
        print(f"[FACE] Extraction failed: {e}")
        return None


# ─── Cross-Document Validation ────────────────────────────────────────────────

def cross_validate_documents(aadhaar_data: dict, pan_data: dict,
                              stated_name: str = None) -> dict:
    result = {
        "name_match_aadhaar_pan": False,
        "dob_match_aadhaar_pan": False,
        "name_match_stated": None,
        "flags": [],
        "verified": False
    }
    if aadhaar_data.get("name") and pan_data.get("name"):
        match = _fuzzy_name_match(aadhaar_data["name"].upper(), pan_data["name"].upper())
        result["name_match_aadhaar_pan"] = match
        if not match:
            result["flags"].append(
                f"NAME_MISMATCH: Aadhaar '{aadhaar_data['name']}' vs PAN '{pan_data['name']}'"
            )
    if aadhaar_data.get("dob") and pan_data.get("dob"):
        match = aadhaar_data["dob"] == pan_data["dob"]
        result["dob_match_aadhaar_pan"] = match
        if not match:
            result["flags"].append(
                f"DOB_MISMATCH: Aadhaar {aadhaar_data['dob']} vs PAN {pan_data['dob']}"
            )
    if stated_name:
        doc_name = aadhaar_data.get("name") or pan_data.get("name") or ""
        match = _fuzzy_name_match(stated_name.upper(), doc_name.upper())
        result["name_match_stated"] = match
        if not match:
            result["flags"].append(
                f"STATED_NAME_MISMATCH: Stated '{stated_name}' vs Document '{doc_name}'"
            )
    result["verified"] = (
        len(result["flags"]) == 0
        and result["name_match_aadhaar_pan"]
        and result["dob_match_aadhaar_pan"]
    )
    return result


def _fuzzy_name_match(name1: str, name2: str, threshold: float = 0.75) -> bool:
    if not name1 or not name2:
        return False
    t1 = {t for t in name1.upper().split() if len(t) > 1}
    t2 = {t for t in name2.upper().split() if len(t) > 1}
    if not t1 or not t2:
        return False
    return len(t1 & t2) / len(t1 | t2) >= threshold


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def verify_document(image_bytes: bytes, document_type: str) -> dict:
    """
    Extract document fields.
    Primary: Groq vision LLM
    Fallback: Tesseract OCR
    """
    doc_type = document_type.lower()
    result   = None

    # Primary — Groq Vision
    print(f"[DOC] Vision extraction → {doc_type}")
    result = _extract_with_vision(image_bytes, doc_type)

    # Fallback — Tesseract
    if not result or result.get("parse_confidence") in ("failed", None, "low"):
        print(f"[DOC] Falling back to Tesseract for {doc_type}")
        try:
            ocr_text = _run_tesseract(image_bytes)
            tess_result = (
                _parse_aadhaar_tesseract(ocr_text)
                if doc_type == "aadhaar"
                else _parse_pan_tesseract(ocr_text)
            )
            # Use tesseract result only if it's better than vision result
            if not result or (
                tess_result.get("parse_confidence", "failed") not in ("failed", "low")
            ):
                result = tess_result
        except Exception as e:
            print(f"[DOC] Tesseract fallback failed: {e}")
            if not result:
                result = {
                    "document_type": doc_type,
                    "parse_confidence": "failed",
                    "error": str(e)
                }

    # Face extraction for Aadhaar
    if doc_type == "aadhaar":
        face_bytes = extract_face_from_aadhaar(image_bytes)
        result["face_image_bytes"] = face_bytes
        result["face_extracted"]   = face_bytes is not None

    print(f"[DOC] Done — confidence: {result.get('parse_confidence')}, "
          f"method: {result.get('extraction_method', 'unknown')}")
    return result

# ─── Point 4: Employee ID Verification ───────────────────────────────────────

EMPLOYEE_ID_PROMPT = """You are a document extraction engine. Extract from this employee ID card.
Return ONLY valid JSON — null for any field not visible:
{
  "employee_name": "string",
  "company_name": "string — exact as printed",
  "employee_id_number": "string",
  "designation": "string",
  "department": "string or null",
  "valid_until": "DD/MM/YYYY or null",
  "parse_confidence": "high/medium/low/failed"
}"""

STUDENT_ID_PROMPT = """You are a document extraction engine. Extract from this student ID card.
Return ONLY valid JSON — null for any field not visible:
{
  "student_name": "string",
  "institution_name": "string",
  "student_id": "string",
  "course": "string",
  "year_of_study": "string or null",
  "valid_until": "DD/MM/YYYY or null",
  "parse_confidence": "high/medium/low/failed"
}"""

ADMISSION_LETTER_PROMPT = """You are a document extraction engine. Extract from this university admission or acceptance letter.
Return ONLY valid JSON — null for any field not visible:
{
  "student_name": "string",
  "institution_name": "string",
  "programme": "string — degree/course name",
  "intake_year": "YYYY or null",
  "study_mode": "full_time or part_time or null",
  "country": "string — country of institution",
  "parse_confidence": "high/medium/low/failed"
}"""


def verify_employee_id(image_bytes: bytes) -> dict:
    """Extract employee details from ID card via Groq Vision."""
    try:
        pil_img = _bytes_to_pil(image_bytes)
        b64_img = _pil_to_base64(pil_img)
        response = _groq.chat.completions.create(
            model=VISION_MODEL,
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}},
                {"type": "text",      "text": EMPLOYEE_ID_PROMPT}
            ]}],
            temperature=0.0, max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            parts = raw.split("```"); raw = parts[1]
            if raw.startswith("json"): raw = raw[4:]
        data = json.loads(raw.strip())
        data["document_type"]     = "employee_id"
        data["extraction_method"] = "groq_vision"
        return data
    except Exception as e:
        print(f"[DOC] Employee ID extraction failed: {e}")
        return {"document_type": "employee_id", "parse_confidence": "failed", "error": str(e)}


def verify_student_id(image_bytes: bytes, doc_subtype: str = "student_id") -> dict:
    """Extract student details from ID card or admission letter via Groq Vision."""
    prompt = ADMISSION_LETTER_PROMPT if doc_subtype == "admission_letter" else STUDENT_ID_PROMPT
    try:
        pil_img = _bytes_to_pil(image_bytes)
        b64_img = _pil_to_base64(pil_img)
        response = _groq.chat.completions.create(
            model=VISION_MODEL,
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}},
                {"type": "text",      "text": prompt}
            ]}],
            temperature=0.0, max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            parts = raw.split("```"); raw = parts[1]
            if raw.startswith("json"): raw = raw[4:]
        data = json.loads(raw.strip())
        data["document_type"]     = doc_subtype
        data["extraction_method"] = "groq_vision"
        return data
    except Exception as e:
        print(f"[DOC] Student doc extraction failed: {e}")
        return {"document_type": doc_subtype, "parse_confidence": "failed", "error": str(e)}


def verify_generic_doc(image_bytes: bytes, doc_type: str, prompt: str) -> dict:
    """General-purpose Groq Vision extraction for any document type."""
    try:
        pil_img = _bytes_to_pil(image_bytes)
        b64_img = _pil_to_base64(pil_img)
        response = _groq.chat.completions.create(
            model=VISION_MODEL,
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}},
                {"type": "text",      "text": prompt}
            ]}],
            temperature=0.0, max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            parts = raw.split("```"); raw = parts[1]
            if raw.startswith("json"): raw = raw[4:]
        data = json.loads(raw.strip())
        data["document_type"]     = doc_type
        data["extraction_method"] = "groq_vision"
        return data
    except Exception as e:
        print(f"[DOC] Generic doc extraction ({doc_type}) failed: {e}")
        return {"document_type": doc_type, "parse_confidence": "failed", "error": str(e)}