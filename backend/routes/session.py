"""
Session & Authentication Routes — updated with:
- email field + SMTP OTP (Point 2)
- /{session_id}/configure endpoint to save loan_type + applicant_category (Points 4+5)
"""

import uuid, random, json, smtplib, os, ssl
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from models.database import get_connection, log_event, update_session, get_session

load_dotenv()
router = APIRouter(prefix="/session", tags=["Session"])

_otp_store: dict[str, dict] = {}
OTP_EXPIRY_MINUTES = 10
SMTP_EMAIL    = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "465"))

VALID_LOAN_TYPES = {
    "personal","instant_personal","business","professional","home",
    "education_domestic","education_international","lap",
    "gold","pre_owned_car","medical_equipment","consumer_durable","commercial_vehicle"
}
VALID_CATEGORIES = {"salaried","self_employed","professional","student","entrepreneur","nri"}


class CreateSessionRequest(BaseModel):
    mobile: str
    email:  str
    ip_address: str = ""
    gps_lat: float = 0.0
    gps_lng: float = 0.0


class VerifyOTPRequest(BaseModel):
    session_id: str
    otp: str


class ConfigureSessionRequest(BaseModel):
    loan_type:          str
    applicant_category: str


def _send_otp_email(to_email: str, otp: str, session_id: str) -> bool:
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return False
    html = f"""<html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0">
<div style="max-width:500px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
<div style="background:#1B2A6B;padding:28px 32px;text-align:center">
<p style="color:#fff;font-size:20px;font-weight:700;margin:0">Poonawalla Fincorp</p>
<p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0">Video Onboarding · Secure Verification</p>
</div>
<div style="padding:32px">
<p style="color:#1B2A6B;font-size:15px;font-weight:600;margin-bottom:8px">Your One-Time Password</p>
<p style="color:#555;font-size:13px;line-height:1.7;margin-bottom:24px">Use the OTP below to verify your identity and begin your loan onboarding session.</p>
<div style="background:#EEF1FA;border:2px solid #1B2A6B;border-radius:10px;text-align:center;padding:20px;margin-bottom:20px">
<p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">One-Time Password</p>
<p style="font-size:40px;font-weight:900;color:#1B2A6B;font-family:monospace;letter-spacing:8px;margin:0">{otp}</p>
<p style="font-size:12px;color:#888;margin:8px 0 0">Valid for {OTP_EXPIRY_MINUTES} minutes only</p>
</div>
<div style="background:#fff8e1;border-left:3px solid #F5881F;padding:12px 16px;border-radius:6px;font-size:12px;color:#7a5c00">
⚠ Never share this OTP. Poonawalla Fincorp will never ask for your OTP by phone.
</div>
</div>
<div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #eee">
<p style="font-size:11px;color:#aaa;margin:0">Poonawalla Fincorp Limited · RBI Registered NBFC<br>This is an automated message. Do not reply.</p>
</div>
</div></body></html>"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your OTP for Poonawalla Fincorp: {otp}"
        msg["From"]    = f"Poonawalla Fincorp <{SMTP_EMAIL}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context()) as s:
            s.login(SMTP_EMAIL, SMTP_PASSWORD)
            s.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[OTP] Email send failed: {e}")
        return False


@router.post("/create")
def create_session(req: CreateSessionRequest):
    mobile = req.mobile.strip().replace(" ","").replace("-","")
    if not mobile.isdigit() or len(mobile) not in [10,12,13]:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    email = req.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO sessions (id,mobile,email,created_at,updated_at,ip_address,gps_lat,gps_lng,status) VALUES (?,?,?,?,?,?,?,?,?)",
            (session_id,mobile,email,now,now,req.ip_address,req.gps_lat,req.gps_lng,"initiated")
        )
        conn.commit()
    except Exception:
        conn.execute(
            "INSERT INTO sessions (id,mobile,created_at,updated_at,ip_address,gps_lat,gps_lng,status) VALUES (?,?,?,?,?,?,?,?)",
            (session_id,mobile,now,now,req.ip_address,req.gps_lat,req.gps_lng,"initiated")
        )
        conn.commit()
    finally:
        conn.close()

    otp        = str(random.randint(100000,999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    _otp_store[session_id] = {"otp": otp, "expires_at": expires_at}
    email_sent = _send_otp_email(email, otp, session_id)

    if not email_sent:
        print(f"\n{'='*50}\n[OTP] Session: {session_id[:12]}  OTP: {otp}\n{'='*50}\n")

    log_event(session_id, "SESSION_CREATED", {"mobile": mobile[:6]+"****", "otp_method": "email" if email_sent else "console"})

    resp = {"session_id": session_id, "message": f"OTP sent to {email[:3]}***@{email.split('@')[-1]}"}
    if not email_sent:
        resp["debug_otp"] = otp
    return resp


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    stored = _otp_store.get(req.session_id)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP expired or not generated")
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del _otp_store[req.session_id]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if req.otp.strip() != stored["otp"]:
        log_event(req.session_id, "OTP_FAILED", {})
        raise HTTPException(status_code=400, detail="Invalid OTP")
    del _otp_store[req.session_id]
    update_session(req.session_id, {"otp_verified": 1, "status": "otp_verified"})
    log_event(req.session_id, "OTP_VERIFIED", {})
    return {"success": True, "message": "Identity verified. Proceed to loan selection."}


@router.post("/{session_id}/configure")
def configure_session(session_id: str, req: ConfigureSessionRequest):
    """Save loan type + applicant category selected in the UI (Screen 1 of flow)."""
    if not get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if req.loan_type not in VALID_LOAN_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid loan_type: {req.loan_type}")
    if req.applicant_category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid applicant_category: {req.applicant_category}")
    update_session(session_id, {"loan_type": req.loan_type, "applicant_category": req.applicant_category})
    log_event(session_id, "LOAN_TYPE_SELECTED", {"loan_type": req.loan_type, "applicant_category": req.applicant_category})
    return {"success": True, "loan_type": req.loan_type, "applicant_category": req.applicant_category}


@router.get("/{session_id}/status")
def get_session_status(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{session_id}/audit")
def get_audit(session_id: str):
    from models.database import get_audit_trail
    if not get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    trail = get_audit_trail(session_id)
    return {"session_id": session_id, "events": trail, "count": len(trail)}