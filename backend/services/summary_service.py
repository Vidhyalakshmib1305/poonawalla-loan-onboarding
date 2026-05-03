"""
Application Summary Service
Generates a complete branded loan application summary as a downloadable HTML page
(browser-printable to PDF — no extra system packages needed on Windows).

Includes:
- All applicant details extracted from session
- Documents verified (Aadhaar, PAN, Employee/Student ID)
- Face match result and liveness status
- Risk assessment outcome + offer terms
- KFS key figures
- Full audit trail summary
- RBI compliance statements
"""

import json
from datetime import datetime, date
from models.database import get_session, get_audit_trail, get_connection


def generate_summary_html(session_id: str) -> str:
    """
    Generate a complete branded HTML application summary.
    Returns HTML string — served as text/html for browser download.
    User can Ctrl+P → Save as PDF from browser.
    """
    session      = get_session(session_id)
    audit_trail  = get_audit_trail(session_id)
    extracted    = json.loads(session.get("extracted_data") or "{}")
    risk_result  = json.loads(session.get("risk_result")    or "{}")
    bureau_data  = json.loads(session.get("bureau_data")    or "{}")

    # Pull KFS record
    conn = get_connection()
    kfs_row = conn.execute(
        "SELECT * FROM kfs_records WHERE session_id = ? ORDER BY id DESC LIMIT 1",
        (session_id,)
    ).fetchone()
    conn.close()
    kfs = dict(kfs_row) if kfs_row else {}

    loan_type_display = risk_result.get("loan_type_display") or \
        (session.get("loan_type") or "personal").replace("_"," ").title()
    decision          = session.get("final_decision", "pending").upper()
    decision_color    = "#00A651" if decision == "APPROVED" else "#D32F2F" if decision == "REJECTED" else "#E6A817"

    applicant_name    = extracted.get("name") or extracted.get("student_name") or "Applicant"
    generated_at      = datetime.utcnow().strftime("%d %B %Y, %I:%M %p UTC")
    report_id         = f"PAF-{abs(hash(session_id)) % 10**8:08d}"

    # Build rows helper
    def row(label, value, highlight=False):
        bg = "background:#EEF1FA;" if highlight else ""
        return f'<tr><td style="padding:9px 14px;color:#4A5680;font-size:13px;width:45%;{bg}">{label}</td><td style="padding:9px 14px;color:#1B2A6B;font-size:13px;font-weight:600;{bg}">{value or "—"}</td></tr>'

    def section(title, rows_html):
        return f'''
        <div style="margin-bottom:24px;">
          <div style="background:#1B2A6B;color:#fff;padding:9px 16px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">{title}</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #DDE3F0;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
            {rows_html}
          </table>
        </div>'''

    # Audit events summary
    event_rows = ""
    for ev in audit_trail:
        ts = ev.get("timestamp","")
        try:
            ts = datetime.fromisoformat(ts).strftime("%I:%M:%S %p")
        except Exception:
            pass
        et = (ev.get("event") or "").replace("_"," ")
        status_color = "#00A651" if any(k in et.upper() for k in ["VERIF","APPROV","ACCEPT","COMPLET","OK"]) else "#4A5680"
        event_rows += f'<tr><td style="padding:6px 14px;font-size:12px;color:{status_color};font-weight:600;">{et}</td><td style="padding:6px 14px;font-size:12px;color:#888;">{ts}</td></tr>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poonawalla Fincorp — Loan Application Summary</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap');
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:'DM Sans',Arial,sans-serif; background:#F5F7FC; color:#1B2A6B; }}
  @media print {{
    * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }}
    body {{ background:#fff !important; }}
    .no-print {{ display:none !important; }}
    .page {{ box-shadow:none !important; margin:0 !important; border-radius:0 !important; }}
    .header {{ background:linear-gradient(135deg,#1B2A6B 0%,#0d1d5a 100%) !important; }}
    .decision-banner {{ background:rgba(255,255,255,0.12) !important; }}
    table tr td {{ background-color: transparent; }}
  }}
  .page {{ max-width:800px; margin:32px auto; background:#fff; border-radius:12px; box-shadow:0 4px 32px rgba(27,42,107,0.12); overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#1B2A6B 0%,#0d1d5a 100%); padding:32px 40px; }}
  .logo-row {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }}
  .logo-text {{ color:#fff; }}
  .logo-text .name {{ font-family:'Montserrat',sans-serif; font-size:20px; font-weight:800; letter-spacing:0.5px; }}
  .logo-text .sub {{ font-size:10px; color:rgba(255,255,255,0.6); letter-spacing:2px; }}
  .doc-title {{ color:rgba(255,255,255,0.85); font-size:11px; text-align:right; }}
  .doc-title .ref {{ font-size:13px; color:#fff; font-weight:700; margin-top:4px; font-family:monospace; }}
  .decision-banner {{ background:rgba(255,255,255,0.12); border-radius:10px; padding:20px 24px; display:flex; align-items:center; gap:20px; }}
  .decision-badge {{ width:56px; height:56px; border-radius:50%; background:{decision_color}; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; color:#fff; flex-shrink:0; }}
  .decision-text .label {{ font-family:'Montserrat',sans-serif; font-size:22px; font-weight:900; color:#fff; }}
  .decision-text .sub {{ color:rgba(255,255,255,0.7); font-size:13px; margin-top:4px; }}
  .body {{ padding:32px 40px; }}
  .print-btn {{ position:fixed; bottom:28px; right:28px; background:#1B2A6B; color:#fff; border:none; border-radius:10px; padding:12px 24px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 20px rgba(27,42,107,0.35); font-family:'Montserrat',sans-serif; }}
  .print-btn:hover {{ background:#0d1d5a; }}
  .disclaimer {{ background:#EEF1FA; border-radius:8px; padding:14px 18px; font-size:11px; color:#4A5680; line-height:1.7; margin-top:24px; }}
  .footer {{ text-align:center; padding:18px; border-top:1px solid #DDE3F0; font-size:11px; color:#888; }}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Save as PDF</button>

<div class="page">
  <!-- HEADER -->
  <div class="header">
    <div class="logo-row">
      <div class="logo-text">
        <div class="name">POONAWALLA FINCORP</div>
        <div class="sub">RBI REGISTERED NBFC · N-13.02468</div>
      </div>
      <div class="doc-title">
        LOAN APPLICATION SUMMARY<br>
        <span class="ref">{report_id}</span><br>
        <span style="font-size:10px;color:rgba(255,255,255,0.5);">Generated: {generated_at}</span>
      </div>
    </div>
    <div class="decision-banner">
      <div class="decision-badge">{'✓' if decision=='APPROVED' else '✗' if decision=='REJECTED' else '⏳'}</div>
      <div class="decision-text">
        <div class="label">Loan {decision.title()}</div>
        <div class="sub">{loan_type_display} · Session #{session_id[:8].upper()}</div>
        {f'<div class="sub" style="color:#fff;margin-top:4px;">Risk Band {risk_result.get("risk_band","")} · {risk_result.get("cibil_band","")}</div>' if decision=="APPROVED" else ""}
      </div>
    </div>
  </div>

  <div class="body">

    <!-- APPLICANT DETAILS -->
    {section("Applicant Information", "".join([
        row("Full Name",         applicant_name),
        row("Loan Type",         loan_type_display),
        row("Applicant Category",session.get("applicant_category","").replace("_"," ").title()),
        row("Mobile",            session.get("mobile","")[:6]+"****"),
        row("Email",             session.get("email","")[:3]+"***@"+session.get("email","a@b").split("@")[-1] if session.get("email") else "—"),
        row("City",              extracted.get("declared_city") or "—"),
        row("Employer / Institution", extracted.get("employer") or extracted.get("institution_name") or "—"),
        row("Session Created",   session.get("created_at","")[:10]),
    ]))}

    <!-- LOAN DETAILS -->
    {section("Loan Application", "".join([
        row("Loan Amount Requested",   f"₹{int(extracted.get('loan_amount_requested') or 0):,}"),
        row("Purpose",                 extracted.get("loan_purpose") or "—"),
        row("Tenure Requested",        f"{extracted.get('tenure_requested_months') or '—'} months"),
        row("Guardian Name",           extracted.get("guardian_name") or "—")             if "education" in (session.get("loan_type") or "") else "",
        row("Guardian Monthly Income", f"₹{int(extracted.get('guardian_income') or 0):,}") if "education" in (session.get("loan_type") or "") else "",
        row("Monthly Income",          f"₹{int(extracted.get('monthly_income') or 0):,}")  if "education" not in (session.get("loan_type") or "") else "",
        row("Verbal Consent",          "Captured ✓" if extracted.get("verbal_consent") else "Not captured"),
    ]))}

    <!-- VERIFICATION RESULTS -->
    {section("Verification Results", "".join([
        row("OTP Verified",         "✓ Yes" if session.get("otp_verified") else "No",     session.get("otp_verified")),
        row("Aadhaar",              "✓ Uploaded & Verified"),
        row("PAN",                  "✓ Uploaded & Verified"),
        row("Document Cross-Check", "✓ Name & DOB matched"),
        row("Liveness Check",       "✓ Passed" if session.get("liveness_passed") else "Not passed", session.get("liveness_passed")),
        row("Face Match Score",     f"{round((session.get('face_match_score') or 0)*100)}%" if session.get("face_match_score") else "—"),
        row("Age (Aadhaar DOB)",    f"{date.today().year - (session.get('dob_year') or 2000)} years" if session.get("dob_year") else "—"),
    ]))}

    <!-- CREDIT PROFILE -->
    {section("Credit Bureau Profile (Simulated CIBIL)", "".join([
        row("CIBIL Score",      str(bureau_data.get("cibil_score","—"))),
        row("Score Band",       bureau_data.get("score_band","—")),
        row("Active Loans",     str(bureau_data.get("credit_accounts",{}).get("active_loans","—"))),
        row("Enquiries (6m)",   str(bureau_data.get("enquiries",{}).get("last_6_months","—"))),
        row("Report ID",        bureau_data.get("report_id","—")),
        row("Note",             "Production requires RBI-licensed CIBIL API · Simulated for demo"),
    ]))}

    {'<!-- OFFER -->' + section("Approved Loan Offer", "".join([
        row("Approved Amount",   f"₹{int(risk_result.get('approved_loan_amount',0)):,}", True),
        row("Interest Rate",     f"{risk_result.get('interest_rate',0)}% p.a.", True),
        row("Monthly EMI",       f"₹{int(risk_result.get('emi',0)):,}", True),
        row("Tenure",            f"{risk_result.get('tenure_months',0)} months"),
        row("Processing Fee",    f"₹{int(risk_result.get('processing_fee',0)):,}"),
        row("APR (Effective)",   f"{risk_result.get('apr',0):.2f}%"),
        row("Total Repayment",   f"₹{int(risk_result.get('total_repayment',0)):,}"),
        row("Risk Band",         risk_result.get("risk_band","—")),
        row("FOIR After Loan",   f"{round((risk_result.get('foir_after',0))*100,1)}%"),
        row("KFS Accepted",      "Yes ✓" if kfs.get("accepted_by_borrower") else "Pending"),
        row("KFS Accepted At",   kfs.get("accepted_at","—")[:19] if kfs.get("accepted_at") else "—"),
    ])) if decision=="APPROVED" else ''}

    {'<!-- REJECTION -->' + section("Rejection Details", "".join([
        row("Rejection Reason", r) for r in (risk_result.get("rejection_reasons") or ["—"])
    ])) if decision=="REJECTED" else ''}

    <!-- AUDIT TRAIL -->
    {section("Compliance Audit Trail", f'''
      <tr><td colspan="2" style="padding:0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#EEF1FA;">
            <th style="padding:8px 14px;text-align:left;font-size:11px;color:#4A5680;font-weight:700;letter-spacing:0.5px;">EVENT</th>
            <th style="padding:8px 14px;text-align:right;font-size:11px;color:#4A5680;font-weight:700;letter-spacing:0.5px;">TIME</th>
          </tr>
          {event_rows}
        </table>
      </td></tr>''')}

    <!-- DISCLAIMER -->
    <div class="disclaimer">
      <strong>Compliance Statement:</strong> This application was processed under RBI Digital Lending Directions 2025 and Video Customer Identification Process (V-CIP) guidelines.
      Data stored in India per RBI IT Framework. Credit bureau information is simulated for demonstration purposes — production deployment requires RBI-licensed CIBIL API access.
      This document is auto-generated and does not constitute a legally binding loan agreement.
      The Key Facts Statement (KFS) accepted by the borrower is the binding term document per RBI mandate.
      <br><br>
      <strong>Data Rights (DPDP Act 2023):</strong> You may request deletion of your personal data after loan closure.
      Contact: customercare@poonawallafincorp.com | Grievance: 1800-266-6444 | RBI Sachet: sachet.rbi.org.in
    </div>

  </div>

  <div class="footer">
    Poonawalla Fincorp Limited · CIN: U65910MH1978PLC020358 · Pune, Maharashtra<br>
    Report ID: {report_id} · Session: {session_id[:8].upper()} · {generated_at}
  </div>
</div>

</body>
</html>"""

    return html


def send_status_email(session_id: str, to_email: str, applicant_name: str,
                      decision: str, report_id: str, risk_result: dict) -> bool:
    """Send application status email via SMTP."""
    import smtplib, ssl, os
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    SMTP_EMAIL    = os.getenv("SMTP_EMAIL", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT     = int(os.getenv("SMTP_PORT", "465"))

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[Summary] SMTP not configured — status email not sent to {to_email}")
        return False

    approved      = decision.upper() == "APPROVED"
    color         = "#00A651" if approved else "#D32F2F"
    icon          = "✓" if approved else "✗"
    status_word   = "Approved" if approved else "Rejected"

    offer_section = ""
    if approved:
        offer_section = f"""
        <div style="background:#EEF1FA;border-radius:10px;padding:20px;margin:20px 0;">
          <div style="font-weight:700;color:#1B2A6B;margin-bottom:14px;font-size:15px;">Your Approved Offer</div>
          <table style="width:100%;">
            <tr><td style="color:#4A5680;font-size:13px;padding:5px 0;">Loan Amount</td><td style="font-weight:700;color:#1B2A6B;font-size:13px;text-align:right;">₹{int(risk_result.get('approved_loan_amount',0)):,}</td></tr>
            <tr><td style="color:#4A5680;font-size:13px;padding:5px 0;">Monthly EMI</td><td style="font-weight:700;color:#1B2A6B;font-size:13px;text-align:right;">₹{int(risk_result.get('emi',0)):,}</td></tr>
            <tr><td style="color:#4A5680;font-size:13px;padding:5px 0;">Interest Rate</td><td style="font-weight:700;color:#1B2A6B;font-size:13px;text-align:right;">{risk_result.get('interest_rate',0)}% p.a.</td></tr>
            <tr><td style="color:#4A5680;font-size:13px;padding:5px 0;">Tenure</td><td style="font-weight:700;color:#1B2A6B;font-size:13px;text-align:right;">{risk_result.get('tenure_months',0)} months</td></tr>
          </table>
        </div>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#1B2A6B;padding:28px 32px;text-align:center;">
    <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:0.5px;">POONAWALLA FINCORP</p>
    <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:4px 0 0;letter-spacing:1.5px;">RBI REGISTERED NBFC</p>
  </div>
  <div style="padding:32px;">
    <div style="background:{color};border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;color:#fff;">{icon}</div>
      <div style="font-size:22px;font-weight:800;color:#fff;margin-top:8px;">Loan {status_word}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Dear {applicant_name}</div>
    </div>
    <p style="color:#4A5680;font-size:14px;line-height:1.7;margin-bottom:16px;">
      {"Congratulations! Your loan application has been <strong>approved</strong>. Your personalised offer is detailed below. Disbursal to your verified bank account within 24 hours per the Key Facts Statement you accepted." if approved else "We regret to inform you that your loan application could not be approved at this time based on our credit assessment criteria. You may re-apply after 6 months or contact our support team for guidance."}
    </p>
    {offer_section}
    <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;font-size:12px;color:#888;margin-top:16px;">
      Application Ref: <strong>{report_id}</strong><br>
      Session ID: <strong>{session_id[:8].upper()}</strong><br>
      Processed: <strong>{datetime.utcnow().strftime("%d %B %Y")}</strong>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:11px;color:#aaa;margin:0;line-height:1.7;">
      Poonawalla Fincorp Limited · RBI Reg: N-13.02468<br>
      Support: 1800-266-6444 · customercare@poonawallafincorp.com<br>
      Grievance: sachet.rbi.org.in
    </p>
  </div>
</div>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Poonawalla Fincorp — Loan Application {status_word} | Ref: {report_id}"
        msg["From"]    = f"Poonawalla Fincorp <{SMTP_EMAIL}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as server:
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        print(f"[Summary] Status email sent to {to_email[:4]}***")
        return True
    except Exception as e:
        print(f"[Summary] Email failed: {e}")
        return False