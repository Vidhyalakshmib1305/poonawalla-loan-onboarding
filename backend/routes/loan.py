"""
Loan Processing Routes
- Audio transcription (Whisper STT)
- LLM data extraction from transcript
- Bureau pull
- Risk engine execution
- Offer generation
- KFS generation and acceptance
"""

import json
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from models.database import log_event, update_session, get_session
from services.stt_service import transcribe_audio_file, merge_transcripts
from services.llm_service import extract_loan_data_from_transcript, classify_risk_persona
from services.bureau_service import fetch_bureau_data, bureau_response_to_dataclass
from services.risk_engine import (
    run_risk_engine, ApplicantData, BureauData, CoApplicantData,
    calculate_emi, LOAN_POLICIES, GLOBAL_POLICY as POLICY
)
from services.kfs_service import generate_kfs, format_kfs_text
try:
    from services.summary_service import generate_summary_html, send_status_email
    _summary_available = True
except Exception as _e:
    print(f"[Loan] summary_service import failed: {_e}")
    _summary_available = False
    def generate_summary_html(sid): return "<h1>Summary unavailable</h1>"
    def send_status_email(*a, **kw): return False

router = APIRouter(prefix="/loan", tags=["Loan"])

# In-memory transcript accumulator (production: Redis)
_transcript_store: dict[str, list] = {}


# ─── Audio Transcription ─────────────────────────────────────────────────────

@router.post("/{session_id}/transcribe-chunk")
async def transcribe_chunk(
    session_id: str,
    audio: UploadFile = File(...),
    language: str = Form(default="en")
):
    """
    Transcribe a single audio chunk from the video call.
    Called repeatedly during the call for real-time transcript display.
    """
    _validate_session(session_id)

    audio_bytes = await audio.read()
    chunk_text = ""

    try:
        from services.stt_service import transcribe_audio_chunk
        chunk_text = transcribe_audio_chunk(audio_bytes, language)
    except Exception as e:
        print(f"[STT] Chunk error: {e}")

    # Accumulate
    if session_id not in _transcript_store:
        _transcript_store[session_id] = []
    if chunk_text.strip():
        _transcript_store[session_id].append(chunk_text.strip())

    full_transcript = merge_transcripts(_transcript_store[session_id])

    return {
        "chunk_text": chunk_text,
        "full_transcript": full_transcript,
        "chunk_count": len(_transcript_store[session_id])
    }


@router.post("/{session_id}/transcribe-full")
async def transcribe_full(
    session_id: str,
    audio: UploadFile = File(...),
    language: str = Form(default="en")
):
    """
    Transcribe the complete call recording.
    Called when call ends to get the full accurate transcript.
    """
    _validate_session(session_id)

    audio_bytes = await audio.read()
    result = transcribe_audio_file(audio_bytes, language)
    full_text = result.get("text", "")

    update_session(session_id, {"transcript": full_text})
    log_event(session_id, "TRANSCRIPT_COMPLETE", {
        "length_chars": len(full_text),
        "language": result.get("language"),
        "segments": len(result.get("segments", []))
    })

    return {
        "transcript": full_text,
        "language": result.get("language"),
        "segments": result.get("segments", [])
    }


# ─── LLM Extraction ──────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    transcript: str


@router.post("/{session_id}/extract-data")
def extract_data(session_id: str, req: ExtractRequest):
    """
    Run Groq LLM on transcript, then enrich with data from uploaded documents.
    Document data (student ID, employee ID, professional cert) fills gaps
    that the transcript failed to capture — critical for education loans
    where the transcript quality may be poor.
    """
    _validate_session(session_id)

    extracted = extract_loan_data_from_transcript(req.transcript)

    # ── Enrich from uploaded KYC documents ────────────────────────────────────
    # Pull doc data from kyc _doc_store via the session's stored JSON fields
    session = _validate_session(session_id)

    # Student ID / Admission Letter → fill institution, course, student name
    student_doc = json.loads(session.get("student_id_data") or "{}")
    if student_doc and student_doc.get("parse_confidence") not in ("failed", None, ""):
        if not extracted.get("institution_name") and student_doc.get("institution_name"):
            extracted["institution_name"] = student_doc["institution_name"]
        if not extracted.get("course_name"):
            extracted["course_name"] = (student_doc.get("course") or
                                        student_doc.get("programme") or
                                        extracted.get("course_name"))
        if not extracted.get("name") and student_doc.get("student_name"):
            extracted["name"] = student_doc["student_name"]
        log_event(session_id, "FIELDS_ENRICHED_FROM_STUDENT_DOC", {
            "institution": extracted.get("institution_name"),
            "course":      extracted.get("course_name"),
        })

    # Employee ID → fill employer, employee name
    employee_doc = json.loads(session.get("employee_id_data") or "{}")
    if employee_doc and employee_doc.get("parse_confidence") not in ("failed", None, ""):
        if not extracted.get("employer") and employee_doc.get("company_name"):
            extracted["employer"] = employee_doc["company_name"]
        if not extracted.get("name") and employee_doc.get("employee_name"):
            extracted["name"] = employee_doc["employee_name"]

    # Session loan_type → set applicant_category and loan_type if LLM missed them
    if not extracted.get("loan_type") and session.get("loan_type"):
        extracted["loan_type"] = session["loan_type"]
    if not extracted.get("applicant_category") and session.get("applicant_category"):
        extracted["applicant_category"] = session["applicant_category"]

    # Education loans: if income came through transcript as monthly_income
    # but we need it as guardian_income, migrate it
    loan_type = extracted.get("loan_type") or session.get("loan_type") or "personal"
    if "education" in loan_type and extracted.get("monthly_income") and not extracted.get("guardian_income"):
        extracted["guardian_income"] = extracted["monthly_income"]
        extracted["monthly_income"]  = 0  # student has no income

    update_session(session_id, {
        "transcript":     req.transcript,
        "extracted_data": json.dumps(extracted),
    })

    log_event(session_id, "LLM_EXTRACTION_COMPLETE", {
        "fields_extracted":  {k: v is not None for k, v in extracted.items()},
        "verbal_consent":    extracted.get("verbal_consent", False),
        "doc_enrichment":    bool(student_doc or employee_doc),
    })

    # Missing check is loan-type-aware
    REQUIRED = {
        "personal":               ["name","monthly_income","loan_amount_requested"],
        "business":               ["name","loan_amount_requested"],
        "professional":           ["name","monthly_income","loan_amount_requested"],
        "education_domestic":     ["name","institution_name","guardian_income","loan_amount_requested"],
        "education_international":["name","institution_name","guardian_income","loan_amount_requested"],
        "gold":                   ["name","gold_weight_grams","loan_amount_requested"],
        "lap":                    ["name","loan_amount_requested"],
        "home":                   ["name","monthly_income","loan_amount_requested"],
        "pre_owned_car":          ["name","monthly_income","loan_amount_requested"],
    }
    req_keys = REQUIRED.get(loan_type, REQUIRED["personal"])
    missing = [f for f in req_keys if not extracted.get(f)]

    return {
        "extracted":              extracted,
        "missing_fields":         missing,
        "extraction_complete":    len(missing) == 0,
        "verbal_consent_captured": extracted.get("verbal_consent", False),
        "doc_enrichment_applied": bool(student_doc.get("parse_confidence") not in ("failed","",None)
                                       or employee_doc.get("parse_confidence") not in ("failed","",None)),
    }


# ─── Risk Assessment ─────────────────────────────────────────────────────────

class RiskRequest(BaseModel):
    pan_number: str
    # Override fields if LLM extraction was incomplete
    override_income: float = None
    override_loan_amount: float = None
    override_tenure_months: int = None


@router.post("/{session_id}/assess-risk")
def assess_risk(session_id: str, req: RiskRequest):
    """
    Full risk assessment:
    1. Pull bureau data (mocked CIBIL)
    2. Build applicant profile from session data
    3. Run RBI-compliant risk engine
    4. Return decision + offer if approved
    """
    try:
        return _assess_risk_inner(session_id, req)
    except HTTPException:
        raise   # re-raise FastAPI HTTP errors (400, 404 etc) — these are intentional
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[RISK] Unhandled error in assess-risk: {e}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}. Check backend console for details."
        )


def _assess_risk_inner(session_id: str, req: RiskRequest):
    session = _validate_session(session_id)

    # Load extracted data
    extracted = json.loads(session.get("extracted_data") or "{}")
    if not extracted or not extracted.get("name"):
        raise HTTPException(
            status_code=400,
            detail="LLM extraction incomplete. Please re-extract from the Review screen first."
        )

    # ── Resolve loan type FIRST (needed for all income/DOB logic below) ────────
    loan_type          = session.get("loan_type") or extracted.get("loan_type") or "personal"
    applicant_category = session.get("applicant_category") or extracted.get("applicant_category") or "salaried"
    is_education_loan  = "education" in loan_type
    is_student         = applicant_category == "student" or bool(extracted.get("is_student"))

    # ── DOB: prefer in-memory KYC store, fall back to session DB, then defaults ──
    # The in-memory _doc_store is wiped on server restart (uvicorn --reload).
    # We store DOB in the sessions table via update_session to survive restarts.
    aadhaar_data = _get_aadhaar_data(session_id)  # may be None after server restart

    # Try to get stored DOB from session (persisted in SQLite)
    dob_year  = (aadhaar_data or {}).get("dob_year")  or session.get("dob_year")  or 1990
    dob_month = (aadhaar_data or {}).get("dob_month") or session.get("dob_month") or 1
    dob_day   = (aadhaar_data or {}).get("dob_day")   or session.get("dob_day")   or 1

    # ── Income resolution ──────────────────────────────────────────────────────
    monthly_income  = req.override_income or extracted.get("monthly_income") or 0
    guardian_income = extracted.get("guardian_income") or 0

    if is_education_loan or is_student:
        if guardian_income <= 0 and monthly_income <= 0:
            # Guardian has no stated income — check if property-based
            prop_value = extracted.get("property_estimated_value") or 0
            if prop_value > 0:
                # Guardian owns property → treat as LAP scenario
                # Override loan_type to LAP for risk engine
                loan_type         = "lap"
                is_education_loan = False
                # Use 0 income — LAP uses property LTV, not FOIR
            else:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Guardian/parent monthly income not captured. "
                        "For education loans, state parent's income during the video call. "
                        "If guardian has no income but owns property, state property value instead."
                    )
                )
        if guardian_income <= 0 and monthly_income > 0:
            guardian_income = monthly_income
            monthly_income  = 0
    else:
        if monthly_income <= 0:
            raise HTTPException(
                status_code=400,
                detail="Monthly income not captured. Please re-run the video call and state your income."
            )

    loan_amount = req.override_loan_amount or extracted.get("loan_amount_requested") or 0
    tenure      = req.override_tenure_months or extracted.get("tenure_requested_months") or 36

    if loan_amount <= 0:
        raise HTTPException(status_code=400, detail="Loan amount not captured.")

    # ── Bureau pull ────────────────────────────────────────────────────────────
    effective_bureau_name   = (extracted.get("guardian_name") or extracted.get("name", "")) if is_education_loan else extracted.get("name", "")
    effective_bureau_income = guardian_income if (is_education_loan or is_student) else monthly_income

    try:
        bureau_response = fetch_bureau_data(
            req.pan_number, effective_bureau_name,
            monthly_income=effective_bureau_income,
            applicant_category=applicant_category,
            is_student=bool(is_student),
        )
    except TypeError:
        # Backward compat: old bureau_service.py without new params
        bureau_response = fetch_bureau_data(req.pan_number, effective_bureau_name,
                                            monthly_income=effective_bureau_income)
    bureau = bureau_response_to_dataclass(bureau_response)

    update_session(session_id, {"bureau_data": json.dumps(bureau_response)})
    log_event(session_id, "BUREAU_PULLED", {
        "cibil_score": bureau.cibil_score,
        "active_loans": bureau.active_loans,
        "enquiries_6m": bureau.enquiries_6m,
    })

    applicant = ApplicantData(
        name=extracted.get("name", ""),
        dob_year=dob_year, dob_month=dob_month, dob_day=dob_day,
        declared_city=extracted.get("declared_city") or session.get("declared_city") or "Chennai",
        employer=extracted.get("employer") or "",
        employment_type=extracted.get("employment_type") or ("student" if is_student else "salaried"),
        years_experience=extracted.get("years_experience") or 0,
        monthly_income=monthly_income,
        loan_purpose=extracted.get("loan_purpose") or "personal",
        loan_amount_requested=loan_amount,
        tenure_requested_months=tenure,
        verbal_consent=extracted.get("verbal_consent", False),
        estimated_age=session.get("age_estimated") or None,
        face_match_score=session.get("face_match_score") or None,
        liveness_passed=bool(session.get("liveness_passed")),
        loan_type=loan_type,
        applicant_category=applicant_category,
        professional_registration_number=extracted.get("professional_registration_number"),
        professional_body=extracted.get("professional_body"),
    )

    # Co-applicant for education loans (guardian) and entrepreneur LAP (guarantor)
    co_applicant = None
    if guardian_income > 0:
        co_applicant = CoApplicantData(
            name=extracted.get("guardian_name") or "Co-Applicant",
            relationship="parent" if is_student else "guarantor",
            monthly_income=guardian_income,
        )
    elif extracted.get("guardian_income", 0) > 0:
        co_applicant = CoApplicantData(
            name=extracted.get("guardian_name") or "Co-Applicant",
            relationship="parent",
            monthly_income=extracted["guardian_income"],
        )

    # Run risk engine
    risk_result = run_risk_engine(applicant, bureau, co_applicant=co_applicant)

    # LLM persona classification
    persona = classify_risk_persona(extracted, {
        "decision": risk_result.decision,
        "risk_band": risk_result.risk_band,
        "cibil_score": bureau.cibil_score,
        "foir_after": risk_result.foir_after,
    })

    # Save to session
    risk_dict = {
        "decision": risk_result.decision,
        "risk_band": risk_result.risk_band,
        "cibil_band": risk_result.cibil_band,
        "foir_before": risk_result.foir_before,
        "foir_after": risk_result.foir_after,
        "eligible_loan_amount": risk_result.eligible_loan_amount,
        "approved_loan_amount": risk_result.approved_loan_amount,
        "interest_rate": risk_result.interest_rate,
        "tenure_months": risk_result.tenure_months,
        "emi": risk_result.emi,
        "processing_fee": risk_result.processing_fee,
        "apr": risk_result.apr,
        "total_repayment": risk_result.total_repayment,
        "rejection_reasons": risk_result.rejection_reasons,
        "fraud_flags": risk_result.fraud_flags,
        "warnings": risk_result.warnings,
        "score_breakdown": risk_result.score_breakdown,
        "persona": persona,
        "bureau_profile": bureau_response.get("profile_label"),
        "loan_type": loan_type,
        "applicant_category": applicant_category,
        "collateral_note": getattr(risk_result, "collateral_note", ""),
        "ltv_applied": getattr(risk_result, "ltv_applied", None),
        "loan_type_display": getattr(risk_result, "loan_type_display", "Personal Loan"),
    }

    update_session(session_id, {
        "risk_result": json.dumps(risk_dict),
        "final_decision": risk_result.decision,
        "rejection_reason": "; ".join(risk_result.rejection_reasons),
        "consent_captured": 1 if extracted.get("verbal_consent") else 0,
    })

    log_event(session_id, "RISK_ASSESSMENT_COMPLETE", {
        "decision": risk_result.decision,
        "risk_band": risk_result.risk_band,
        "reasons_count": len(risk_result.rejection_reasons),
        "fraud_flags_count": len(risk_result.fraud_flags),
    })

    return {
        "decision": risk_result.decision,
        "risk_result": risk_dict,
        "bureau": bureau_response,
        "persona": persona,
    }


# ─── KFS Generation ──────────────────────────────────────────────────────────

@router.post("/{session_id}/generate-kfs")
def generate_kfs_endpoint(session_id: str):
    """
    Generate the mandatory Key Facts Statement.
    Must be called before borrower accepts the offer.
    """
    session = _validate_session(session_id)

    if session.get("final_decision") != "approved":
        raise HTTPException(status_code=400, detail="KFS only generated for approved applications")

    risk_result = json.loads(session.get("risk_result") or "{}")
    extracted = json.loads(session.get("extracted_data") or "{}")

    kfs = generate_kfs(
        session_id=session_id,
        applicant_name=extracted.get("name", "Applicant"),
        loan_amount=risk_result.get("approved_loan_amount", 0),
        interest_rate=risk_result.get("interest_rate", 0),
        tenure_months=risk_result.get("tenure_months", 0),
        emi=risk_result.get("emi", 0),
        processing_fee=risk_result.get("processing_fee", 0),
        apr=risk_result.get("apr", 0),
        total_repayment=risk_result.get("total_repayment", 0),
        loan_purpose=extracted.get("loan_purpose", "Personal"),
        risk_band=risk_result.get("risk_band", "C"),
        loan_type=risk_result.get("loan_type", "personal"),
        collateral_note=risk_result.get("collateral_note", ""),
    )

    kfs_text = format_kfs_text(kfs)

    # Save KFS to DB
    conn = __import__('models.database', fromlist=['get_connection']).get_connection()
    conn.execute(
        """INSERT INTO kfs_records
           (session_id, loan_amount, interest_rate, tenure_months, emi,
            processing_fee, apr, total_repayment, generated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, risk_result.get("approved_loan_amount"), risk_result.get("interest_rate"),
         risk_result.get("tenure_months"), risk_result.get("emi"),
         risk_result.get("processing_fee"), risk_result.get("apr"),
         risk_result.get("total_repayment"), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    log_event(session_id, "KFS_GENERATED", {"loan_amount": risk_result.get("approved_loan_amount")})

    return {"kfs": kfs, "kfs_text": kfs_text}


class AcceptKFSRequest(BaseModel):
    confirmed: bool


@router.post("/{session_id}/accept-kfs")
def accept_kfs(session_id: str, req: AcceptKFSRequest):
    """Borrower accepts the KFS — recorded in audit trail as required by RBI."""
    if not req.confirmed:
        raise HTTPException(status_code=400, detail="KFS not confirmed")

    accepted_at = datetime.utcnow().isoformat()

    conn = __import__('models.database', fromlist=['get_connection']).get_connection()
    conn.execute(
        "UPDATE kfs_records SET accepted_by_borrower = 1, accepted_at = ? WHERE session_id = ?",
        (accepted_at, session_id)
    )
    conn.commit()
    conn.close()

    log_event(session_id, "KFS_ACCEPTED_BY_BORROWER", {"accepted_at": accepted_at})

    # Send status email to applicant
    session     = get_session(session_id)
    to_email    = session.get("email", "")
    extracted   = json.loads(session.get("extracted_data") or "{}")
    risk_result_data = json.loads(session.get("risk_result") or "{}")
    report_id   = f"PAF-{abs(hash(session_id)) % 10**8:08d}"
    applicant_name = extracted.get("name") or extracted.get("guardian_name") or "Applicant"

    print(f"[KFS] Accept — email={to_email!r}, decision={session.get('final_decision')}, name={applicant_name}")
    if to_email:
        import threading
        def _send():
            ok = send_status_email(
                session_id, to_email, applicant_name,
                session.get("final_decision","approved"), report_id, risk_result_data
            )
            print(f"[KFS] Status email {'sent' if ok else 'FAILED (check SMTP config in backend/.env)'} → {to_email[:4]}***")
        threading.Thread(target=_send, daemon=True).start()
    else:
        print("[KFS] No email address in session — status email skipped. "
              "Check that session.py stored the email field in database.")

    return {
        "success": True,
        "message": "KFS accepted. Loan application submitted for final processing.",
        "accepted_at": accepted_at,
        "report_id": report_id,
        "next_step": "Loan disbursal to verified bank account within 24 hours (as per KFS terms)"
    }


@router.get("/{session_id}/application-summary")
def get_application_summary(session_id: str):
    """
    Generate and return the complete application summary as a downloadable HTML page.
    User can Ctrl+P → Save as PDF from their browser.
    """
    _validate_session(session_id)
    try:
        html = generate_summary_html(session_id)
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html, headers={
            "Content-Disposition": f"inline; filename=poonawalla-loan-summary-{session_id[:8]}.html"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {e}")





class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

CHAT_SYSTEM_PROMPT = """You are Priya, a warm and knowledgeable AI loan advisor for Poonawalla Fincorp — one of India's leading RBI-registered NBFCs.

You ONLY answer questions about:
1. Poonawalla Fincorp loan products and their details
2. Loan eligibility, documentation, and application process
3. Interest rates, EMI calculations, and repayment terms
4. This AI Video KYC onboarding system
5. RBI guidelines relevant to borrowers

Poonawalla Fincorp Loan Products (verified rates):
- Personal Loan: 9.99%+ p.a., up to ₹30 Lakh, 12–60 months, no collateral
- Instant Personal Loan: 9.99%+ p.a., up to ₹5 Lakh, pre-approved
- Business Loan: 15%+ p.a., up to ₹50 Lakh, 12–60 months
- Professional Loan: 13%+ p.a., up to ₹75 Lakh (for CA, Doctor, CS, Architect)
- Home Loan: 9.55%+ p.a. (women: 8.75%), up to 30 years
- Education Loan (Domestic): 10%+ p.a., up to ₹20 Lakh, no collateral ≤₹4L (RBI rule)
- Education Loan (International): 10.5%+ p.a., up to ₹50 Lakh
- Loan Against Property (LAP): 9%+ p.a., up to ₹10 Crore, 75% LTV residential / 60% commercial
- Gold Loan: 9.99%+ p.a., RBI 2025 LTV: 85% (≤₹2.5L) / 80% (₹2.5-5L) / 75% (>₹5L)
- Pre-Owned Car Loan: 12%+ p.a., up to ₹75 Lakh
- Medical Equipment Loan: 9.99%+ p.a., up to ₹10 Crore
- Consumer Durable Loan: 0-9%, up to ₹5 Lakh

Eligibility basics:
- Age: 21–60 years at loan maturity
- Min income: ₹15,000/month (personal), ₹2L/year (business)
- CIBIL: 700+ preferred, 650+ with conditions
- FOIR (Fixed Obligation to Income Ratio): max 50% per RBI

This onboarding system:
- 100% digital, no branch visit needed
- Video KYC per RBI V-CIP guidelines
- AI extracts income details from video conversation
- Aadhaar + PAN verification
- Instant risk assessment + personalised offer

Rules:
- Be concise (2-4 sentences per response unless calculation needed)
- Show EMI formula when asked: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
- Never hallucinate rates or products not listed above
- If unsure, say "Please contact 1800-266-6444 for accurate information"
- Never answer questions unrelated to Poonawalla Fincorp or loans
- If asked personal or sensitive questions, politely redirect to loan topics
"""

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """Chatbot — uses Groq API (same key already configured for LLM extraction)."""
    import os, requests as _req

    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in backend/.env")

    # Sanitise: last 12 turns, 600 chars each
    messages = [
        {"role": m.role, "content": m.content[:600]}
        for m in req.messages[-12:]
        if m.role in ("user", "assistant")
    ]
    if not messages:
        return {"reply": "Please ask me something about our loan products!"}

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": CHAT_SYSTEM_PROMPT}] + messages,
        "max_tokens": 350,
        "temperature": 0.35,
        "top_p": 0.9,
    }

    try:
        r = _req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=20,
        )
        if not r.ok:
            print(f"[Chat] Groq HTTP {r.status_code}: {r.text[:200]}")
            raise HTTPException(status_code=502, detail=f"Groq API error: {r.status_code}")
        reply = r.json()["choices"][0]["message"]["content"].strip()
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/test-email")
def test_email(session_id: str):
    """Dev endpoint — sends a test email to verify SMTP config."""
    session  = _validate_session(session_id)
    to_email = session.get("email", "")
    if not to_email:
        return {"error": "No email in session. Complete Auth step first.", "session_email": to_email}
    import os
    smtp_email = os.getenv("SMTP_EMAIL","")
    smtp_pass  = os.getenv("SMTP_PASSWORD","")
    if not smtp_email or not smtp_pass:
        return {"error": "SMTP_EMAIL or SMTP_PASSWORD not set in backend/.env",
                "smtp_email_set": bool(smtp_email), "smtp_password_set": bool(smtp_pass)}

    risk_result_data = json.loads(session.get("risk_result") or "{}")
    report_id = f"PAF-TEST-{abs(hash(session_id)) % 10**6:06d}"
    ok = send_status_email(
        session_id, to_email,
        session.get("extracted_data") and json.loads(session.get("extracted_data") or "{}").get("name","Test User") or "Test User",
        "approved", report_id, risk_result_data
    )
    return {
        "email_sent": ok,
        "to_email":   to_email[:4] + "***",
        "from_email": smtp_email[:4] + "***",
        "tip": "Check SPAM folder — Gmail-to-Gmail emails often land there." if ok else "Failed — check SMTP credentials"
    }

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _validate_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _get_aadhaar_data(session_id: str) -> dict:
    """Retrieve stored Aadhaar data for this session."""
    from routes.kyc import _doc_store
    return _doc_store.get(session_id, {}).get("aadhaar_data")