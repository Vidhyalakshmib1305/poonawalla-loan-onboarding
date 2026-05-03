"""
Refer & Earn — Email OTP flow
Routes:
  POST /refer/send-otp     — verify customer email, send OTP via email
  POST /refer/verify-otp   — validate OTP, return unique referral link
  GET  /refer/status        — check coins / referral status for an email
"""

import hashlib
import os
import random
import string
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from models.database import (
    get_connection,
    is_registered_customer,
    get_referral_by_email,
    get_referral_by_token,
)

router = APIRouter(prefix="/refer", tags=["Refer & Earn"])

# ── helpers ──────────────────────────────────────────────────────────────────

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _generate_token(email: str) -> str:
    """Short, URL-safe referral token tied to the customer's email."""
    base = f"{email}-{uuid.uuid4().hex[:8]}"
    return hashlib.md5(base.encode()).hexdigest()[:12].upper()


def _send_email_otp(email: str, otp: str):
    """
    Send OTP via Gmail SMTP.
    Uses SMTP_EMAIL and SMTP_PASSWORD from .env.
    No extra packages needed — smtplib is built into Python.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_email    = os.getenv("SMTP_EMAIL", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        print(f"[Refer][DEV] OTP for {email}: {otp}  <- set SMTP_EMAIL and SMTP_PASSWORD in .env")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Poonawalla Fincorp Referral OTP"
    msg["From"]    = smtp_email
    msg["To"]      = email

    html = (
        f"<div style='font-family:sans-serif;max-width:480px;margin:auto'>"
        f"<h2 style='color:#1B2A6B'>Poonawalla Fincorp - Refer &amp; Earn</h2>"
        f"<p>Your one-time password is:</p>"
        f"<div style='font-size:32px;font-weight:900;letter-spacing:10px;"
        f"color:#1B2A6B;padding:20px 0'>{otp}</div>"
        f"<p style='color:#666'>Valid for <strong>10 minutes</strong>. "
        f"Do not share this OTP with anyone.</p>"
        f"<hr style='border:none;border-top:1px solid #eee'/>"
        f"<p style='font-size:12px;color:#aaa'>"
        f"Poonawalla Fincorp Limited | This is an automated message.</p>"
        f"</div>"
    )
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, email, msg.as_string())
        print(f"[Refer] OTP sent to {email} via Gmail SMTP")
    except Exception as e:
        print(f"[Refer][ERROR] Failed to send OTP to {email}: {e}")
        raise


# ── schemas ───────────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    email: str          # EmailStr requires email-validator; plain str is safe here


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(req: SendOtpRequest):
    email = req.email.lower().strip()

    # 1. Check the customer exists in our DB
    if not is_registered_customer(email):
        raise HTTPException(
            status_code=404,
            detail="This email is not linked to a Poonawalla Fincorp account."
        )

    # 2. Generate a 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    otp_hash = _hash_otp(otp)
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

    # 3. Invalidate any previous unused OTPs for this email
    conn = get_connection()
    conn.execute(
        "UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0",
        (email,)
    )
    conn.execute(
        "INSERT INTO email_otps (email, otp_hash, expires_at, used) VALUES (?, ?, ?, 0)",
        (email, otp_hash, expires_at)
    )
    conn.commit()
    conn.close()

    # 4. Send the OTP
    _send_email_otp(email, otp)

    return {"message": "OTP sent to your registered email address.", "email": email}


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    email = req.email.lower().strip()
    otp_hash = _hash_otp(req.otp.strip())
    now = datetime.utcnow().isoformat()

    # 1. Look up a valid, unexpired OTP
    conn = get_connection()
    row = conn.execute(
        """SELECT id FROM email_otps
           WHERE email = ? AND otp_hash = ? AND used = 0 AND expires_at > ?
           ORDER BY id DESC LIMIT 1""",
        (email, otp_hash, now)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")

    # 2. Mark OTP as used
    conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (row["id"],))
    conn.commit()
    conn.close()

    # 3. Get or create the referral record (one token per customer, CRED-style)
    existing = get_referral_by_email(email)
    if existing:
        token = existing["referral_token"]
    else:
        token = _generate_token(email)
        ref_id = str(uuid.uuid4())
        conn = get_connection()
        conn.execute(
            """INSERT INTO referrals (id, referrer_email, referral_token, status, coins_earned, created_at)
               VALUES (?, ?, ?, 'pending', 0, ?)""",
            (ref_id, email, token, datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()

    referral_link = f"https://poonawallafincorp.com/apply?ref={token}"

    return {
        "message": "OTP verified successfully.",
        "referral_token": token,
        "referral_link": referral_link,
        "coins_pending": existing["coins_earned"] if existing else 0,
    }


@router.get("/status")
def referral_status(email: str):
    """Returns the referral record and coin balance for a verified customer."""
    email = email.lower().strip()
    if not is_registered_customer(email):
        raise HTTPException(status_code=404, detail="Customer not found.")

    record = get_referral_by_email(email)
    if not record:
        return {"has_referral": False, "coins_earned": 0, "referral_link": None}

    return {
        "has_referral": True,
        "referral_token": record["referral_token"],
        "referral_link": f"https://poonawallafincorp.com/apply?ref={record['referral_token']}",
        "coins_earned": record["coins_earned"],
        "status": record["status"],
        "created_at": record["created_at"],
    }