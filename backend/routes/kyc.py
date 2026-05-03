"""
KYC Routes — expanded for Points 4+5.
New: employee-id, student-id, admission-letter, professional-cert,
     business-reg upload endpoints with Groq Vision + employer cross-check.
"""

import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from models.database import log_event, update_session, get_session
from services.document_service import (
    verify_document, cross_validate_documents,
    verify_employee_id, verify_student_id, verify_generic_doc,
)
from services.face_service import match_faces, match_faces_multiframe, estimate_age, estimate_age_multiframe, check_liveness_frames

router = APIRouter(prefix="/kyc", tags=["KYC"])
_doc_store: dict[str, dict] = {}


def _validate_session(session_id: str, require_otp: bool = False):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if require_otp and not session.get("otp_verified"):
        raise HTTPException(status_code=403, detail="OTP not verified for this session")
    return session


def _init_store(session_id: str):
    if session_id not in _doc_store:
        _doc_store[session_id] = {}


async def _read_file(file: UploadFile, max_mb: int = 10) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_mb}MB)")
    return data


def _fuzzy_match(a: str, b: str, threshold: float = 0.4) -> bool:
    if not a or not b:
        return False
    t1 = {t for t in a.upper().split() if len(t) > 1}
    t2 = {t for t in b.upper().split() if len(t) > 1}
    if not t1 or not t2:
        return False
    return len(t1 & t2) / len(t1 | t2) >= threshold


# ─── Aadhaar ──────────────────────────────────────────────────────────────────

@router.post("/{session_id}/upload-aadhaar")
async def upload_aadhaar(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    aadhaar_data = verify_document(image_bytes, "aadhaar")
    if aadhaar_data.get("parse_confidence") == "failed":
        raise HTTPException(status_code=422, detail="Could not extract data from Aadhaar. Upload a clearer photo.")
    _init_store(session_id)
    face_bytes = aadhaar_data.pop("face_image_bytes", None)
    face_extracted = aadhaar_data.pop("face_extracted", False)
    _doc_store[session_id].update({"aadhaar_image": image_bytes, "aadhaar_face_image": face_bytes, "aadhaar_data": aadhaar_data})
    log_event(session_id, "AADHAAR_UPLOADED", {"confidence": aadhaar_data.get("parse_confidence"), "face_extracted": face_extracted})

    # Persist DOB to SQLite session — survives server restarts unlike _doc_store
    dob_fields = {}
    if aadhaar_data.get("dob_year"):  dob_fields["dob_year"]  = aadhaar_data["dob_year"]
    if aadhaar_data.get("dob_month"): dob_fields["dob_month"] = aadhaar_data["dob_month"]
    if aadhaar_data.get("dob_day"):   dob_fields["dob_day"]   = aadhaar_data["dob_day"]
    if dob_fields:
        update_session(session_id, dob_fields)
    return {"success": True, "face_extracted": face_extracted,
            "extracted": {k: aadhaar_data.get(k) for k in ["name","dob","gender","aadhaar_number_masked","address","parse_confidence"]}}


# ─── PAN ──────────────────────────────────────────────────────────────────────

@router.post("/{session_id}/upload-pan")
async def upload_pan(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    pan_data = verify_document(image_bytes, "pan")
    if pan_data.get("parse_confidence") == "failed":
        raise HTTPException(status_code=422, detail="Could not extract data from PAN card.")
    _init_store(session_id)
    _doc_store[session_id]["pan_data"] = pan_data
    log_event(session_id, "PAN_UPLOADED", {"pan_number": pan_data.get("pan_number")})
    return {"success": True, "extracted": {k: pan_data.get(k) for k in ["name","dob","pan_number","parse_confidence"]}}


# ─── Employee ID (Point 4) ────────────────────────────────────────────────────

@router.post("/{session_id}/upload-employee-id")
async def upload_employee_id(session_id: str, file: UploadFile = File(...)):
    """
    Groq Vision extracts: employee_name, company_name, employee_id_number, designation.
    Cross-checks company_name vs employer stated in video transcript.
    Mismatch -> EMPLOYER_MISMATCH flag (not hard reject — manual review).
    """
    session = _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    result = verify_employee_id(image_bytes)
    _init_store(session_id)
    _doc_store[session_id]["employee_id_data"] = result

    employer_mismatch = False
    extracted = json.loads(session.get("extracted_data") or "{}")
    stated_employer = extracted.get("employer", "")
    id_company = result.get("company_name", "")

    if stated_employer and id_company:
        if not _fuzzy_match(id_company, stated_employer):
            employer_mismatch = True
            result["employer_mismatch_flag"] = True
            result["employer_mismatch_detail"] = (
                f"ID card company '{id_company}' does not match video-stated employer '{stated_employer}'"
            )
            log_event(session_id, "EMPLOYER_MISMATCH", {"id_company": id_company, "stated_employer": stated_employer})

    update_session(session_id, {"employee_id_data": json.dumps(result)})
    log_event(session_id, "EMPLOYEE_ID_UPLOADED", {"company": id_company, "mismatch": employer_mismatch})
    return {"success": True, "extracted": result, "employer_mismatch": employer_mismatch,
            "employer_mismatch_note": result.get("employer_mismatch_detail") if employer_mismatch else None}


# ─── Student ID (Point 4) ─────────────────────────────────────────────────────

@router.post("/{session_id}/upload-student-id")
async def upload_student_id(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    result = verify_student_id(image_bytes, doc_subtype="student_id")
    _init_store(session_id)
    _doc_store[session_id]["student_id_data"] = result
    update_session(session_id, {"student_id_data": json.dumps(result)})
    log_event(session_id, "STUDENT_ID_UPLOADED", {"institution": result.get("institution_name")})
    return {"success": True, "extracted": result}


# ─── Admission Letter (Point 4) ───────────────────────────────────────────────

@router.post("/{session_id}/upload-admission-letter")
async def upload_admission_letter(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    result = verify_student_id(image_bytes, doc_subtype="admission_letter")
    _init_store(session_id)
    _doc_store[session_id]["admission_letter_data"] = result
    update_session(session_id, {"student_id_data": json.dumps(result)})
    log_event(session_id, "ADMISSION_LETTER_UPLOADED", {"institution": result.get("institution_name")})
    return {"success": True, "extracted": result}


# ─── Professional Certificate (Point 5) ───────────────────────────────────────

@router.post("/{session_id}/upload-professional-cert")
async def upload_professional_cert(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    prompt = """Extract from this professional certificate (ICAI/MCI/ICSI/Bar Council).
Return ONLY JSON: {"professional_name":"string","registration_number":"string",
"professional_body":"string","designation":"string","issue_date":"DD/MM/YYYY or null",
"valid_until":"DD/MM/YYYY or null","parse_confidence":"high/medium/low/failed"}"""
    result = verify_generic_doc(image_bytes, "professional_certificate", prompt)
    _init_store(session_id)
    _doc_store[session_id]["professional_cert_data"] = result
    log_event(session_id, "PROFESSIONAL_CERT_UPLOADED", {"body": result.get("professional_body"), "reg": result.get("registration_number")})
    return {"success": True, "extracted": result}


# ─── Business Registration (Point 5) ──────────────────────────────────────────

@router.post("/{session_id}/upload-business-reg")
async def upload_business_reg(session_id: str, file: UploadFile = File(...)):
    _validate_session(session_id, require_otp=True)
    image_bytes = await _read_file(file)
    prompt = """Extract from this business registration document (GST/Udyam/MSME).
Return ONLY JSON: {"business_name":"string","registration_number":"string",
"registration_type":"GST or Udyam or MSME or other","owner_name":"string",
"registration_date":"DD/MM/YYYY or null","business_address":"string","parse_confidence":"high/medium/low/failed"}"""
    result = verify_generic_doc(image_bytes, "business_registration", prompt)
    _init_store(session_id)
    _doc_store[session_id]["business_reg_data"] = result
    log_event(session_id, "BUSINESS_REG_UPLOADED", {"business": result.get("business_name")})
    return {"success": True, "extracted": result}


# ─── Cross Validate ───────────────────────────────────────────────────────────

@router.post("/{session_id}/cross-validate")
async def cross_validate(session_id: str):
    _validate_session(session_id, require_otp=True)
    docs = _doc_store.get(session_id, {})
    if not docs.get("aadhaar_data"):
        raise HTTPException(status_code=400, detail="Aadhaar not uploaded yet")
    if not docs.get("pan_data"):
        raise HTTPException(status_code=400, detail="PAN not uploaded yet")
    validation = cross_validate_documents(docs["aadhaar_data"], docs["pan_data"])
    log_event(session_id, "DOCUMENTS_CROSS_VALIDATED", validation)
    if not validation["verified"] and validation.get("flags"):
        return {"success": True, "verified": False, "flags": validation["flags"],
                "message": "Document discrepancies flagged for manual review.", "can_proceed": True}
    update_session(session_id, {"kyc_verified": 1, "status": "kyc_done"})
    return {"success": True, "verified": True, "flags": [],
            "name_match": validation["name_match_aadhaar_pan"],
            "dob_match": validation["dob_match_aadhaar_pan"],
            "message": "Documents verified successfully."}


# ─── Liveness ─────────────────────────────────────────────────────────────────

@router.post("/{session_id}/liveness-check")
async def liveness_check(session_id: str, frames: list[UploadFile] = File(...)):
    _validate_session(session_id, require_otp=True)
    if len(frames) < 3:
        raise HTTPException(status_code=400, detail="Send at least 3 frames")
    frames_bytes = [await f.read() for f in frames]
    result = check_liveness_frames(frames_bytes)
    log_event(session_id, "LIVENESS_CHECK", result)
    if result["liveness_passed"]:
        update_session(session_id, {"liveness_passed": 1})
    return result


# ─── Face Match ───────────────────────────────────────────────────────────────

@router.post("/{session_id}/face-match")
async def face_match(session_id: str, frames: list[UploadFile] = File(...)):
    _validate_session(session_id, require_otp=True)
    if not frames:
        raise HTTPException(status_code=400, detail="No frames provided")
    docs = _doc_store.get(session_id, {})
    ref  = docs.get("aadhaar_face_image") or docs.get("aadhaar_image")
    if not ref:
        raise HTTPException(status_code=400, detail="Aadhaar not uploaded yet")

    frames_bytes = [await f.read() for f in frames]
    match_result = (match_faces_multiframe(ref, frames_bytes)
                    if len(frames_bytes) > 1 else match_faces(ref, frames_bytes[0]))
    # Use all frames for age averaging (more accurate than single frame)
    age_result = estimate_age_multiframe(frames_bytes)
    doc_dob_year = docs.get("aadhaar_data", {}).get("dob_year")
    age_flag      = False
    age_flag_note = None
    if age_result.get("estimated_age") and doc_dob_year:
        from datetime import date
        doc_age  = date.today().year - doc_dob_year
        age_diff = abs(age_result["estimated_age"] - doc_age)
        if age_diff > 20:
            age_flag = True
            age_flag_note = f"Estimated {age_result['estimated_age']} vs Aadhaar DOB age {doc_age} ({age_diff}yr gap)"
        elif age_diff > 10:
            age_flag_note = f"Minor discrepancy: estimated {age_result['estimated_age']} vs document {doc_age} ({age_diff}yr) — within error margin"

    policy_verdict = match_result.get("policy_verdict", "FAIL")
    # age_flag does NOT block can_proceed — Aadhaar DOB is the authoritative age.
    # Face age estimation is advisory/audit only (DeepFace has ±8yr error on South Asian faces).
    can_proceed = policy_verdict in ("PASS", "MANUAL_REVIEW")

    update_session(session_id, {
        "face_match_score": match_result.get("similarity_score", 0),
        "age_estimated":    age_result.get("estimated_age") or 0,
        "age_flag":         1 if age_flag else 0,
    })
    log_event(session_id, "FACE_MATCH_COMPLETED", {"policy_verdict": policy_verdict, "can_proceed": can_proceed})
    return {
        "face_match": match_result, "age_estimation": age_result,
        "age_flag": age_flag,
        "age_flag_reason": age_flag_note,
        "policy_verdict": policy_verdict,
        "overall_pass": policy_verdict == "PASS",
        "can_proceed": can_proceed,
        "manual_review_required": policy_verdict == "MANUAL_REVIEW",
    }


# ─── Aadhaar Face Photo ───────────────────────────────────────────────────────

@router.get("/{session_id}/aadhaar-face")
async def get_aadhaar_face(session_id: str):
    face = _doc_store.get(session_id, {}).get("aadhaar_face_image")
    if not face:
        raise HTTPException(status_code=404, detail="No face image extracted")
    return Response(content=face, media_type="image/jpeg")


@router.get("/{session_id}/debug-store")
async def debug_store(session_id: str):
    docs = _doc_store.get(session_id, {})
    return {k: (len(v) if isinstance(v, bytes) else type(v).__name__) for k, v in docs.items()}
