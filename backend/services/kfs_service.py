"""
Key Facts Statement Generator — RBI Digital Lending Directions 2025.
Updated: Poonawalla Fincorp branding + loan-type-specific disclosures.
"""

from datetime import datetime, date, timedelta


def generate_kfs(
    session_id: str,
    applicant_name: str,
    loan_amount: float,
    interest_rate: float,
    tenure_months: int,
    emi: float,
    processing_fee: float,
    apr: float,
    total_repayment: float,
    loan_purpose: str,
    risk_band: str,
    loan_type: str = "personal",
    collateral_note: str = "",
) -> dict:

    from services.risk_engine import LOAN_POLICIES
    policy = LOAN_POLICIES.get(loan_type, LOAN_POLICIES["personal"])
    loan_display = policy.get("display_name", "Personal Loan")
    is_secured   = policy.get("collateral", "none") != "none"

    disbursal_amount = loan_amount - processing_fee

    kfs = {
        "kfs_version":  "RBI_Digital_Lending_2025_v1",
        "session_id":   session_id,
        "generated_at": datetime.utcnow().isoformat(),

        "lender": {
            "name":             "Poonawalla Fincorp Limited",
            "rbi_registration": "N-13.02468",
            "cin":              "U65910MH1978PLC020358",
            "address":          "Poonawalla House, 5B, Bund Garden Road, Pune - 411001",
            "grievance_email":  "customercare@poonawallafincorp.com",
            "grievance_phone":  "1800-266-6444",
            "rbi_sachet_link":  "https://sachet.rbi.org.in",
            "website":          "https://www.poonawallafincorp.com",
        },

        "borrower_name": applicant_name,
        "loan_purpose":  loan_purpose,
        "loan_type":     loan_display,

        "loan_details": {
            "sanctioned_loan_amount_inr": loan_amount,
            "disbursal_amount_inr":       disbursal_amount,
            "tenure_months":              tenure_months,
            "type":    f"{'Secured' if is_secured else 'Unsecured'} {loan_display}",
            "rate_type":                  "Fixed",
            "collateral":                 policy.get("collateral", "none").replace("_", " ").title(),
            "collateral_note":            collateral_note or ("Not applicable" if not is_secured else "As per sanction letter"),
        },

        "cost_details": {
            "annual_interest_rate_pct":    interest_rate,
            "apr_pct":                     apr,
            "emi_inr":                     emi,
            "total_repayment_inr":         total_repayment,
            "total_interest_payable_inr":  round(total_repayment - loan_amount, 2),
        },

        "fees_and_charges": {
            "processing_fee_inr":                  processing_fee,
            "processing_fee_pct":                  policy["processing_fee_pct"] * 100,
            "prepayment_penalty":                  policy.get("prepayment_note", "NIL after 12 EMIs"),
            "late_payment_penalty_per_month_pct":  2.0,
            "cheque_bounce_charge_inr":            500.0,
            "loan_cancellation_charge":            "NIL within 3 days of disbursal (cooling-off period)",
            "stamp_duty":                          "Actuals as per state laws",
            "other_charges":                       "NIL",
        },

        "disbursal_repayment": {
            "disbursal_mode":     "Direct bank transfer to verified borrower account only",
            "disbursal_note":     "Per RBI directions, funds cannot be routed through third parties",
            "repayment_mode":     "ECS / NACH auto-debit from borrower's registered bank account",
            "first_emi_due":      (date.today() + timedelta(days=30)).strftime("%d %B %Y"),
            "emi_frequency":      "Monthly",
        },

        "borrower_rights": {
            "cooling_off_period": "Cancel within 3 business days of disbursal — no penalty.",
            "prepayment_right":   policy.get("prepayment_note", "NIL after 12 EMIs"),
            "grievance_right":    "Escalate to RBI Sachet: https://sachet.rbi.org.in",
            "data_rights":        "Data stored in India per RBI IT framework. Request deletion after closure.",
            "credit_reporting":   "Reported to CIBIL/Experian/Equifax/CRIF as required by RBI.",
        },

        "risk_disclosure": {
            "risk_band": risk_band,
            "statement": (
                "Default on EMIs will negatively impact your CIBIL credit score and will be "
                "reported to credit bureaus. Legal recovery may be initiated per applicable laws. "
                "Ensure EMIs are within your repayment capacity."
            ),
        },

        "consent_required": {
            "borrower_must_confirm": [
                "I have read and understood this Key Facts Statement.",
                "I confirm the loan details and charges are as explained.",
                "I give consent for Aadhaar-based eKYC and bureau data access.",
                "I authorise NACH/ECS mandate for EMI auto-debit.",
                "I confirm all information provided is accurate.",
            ]
        },

        "accepted_by_borrower": False,
        "accepted_at":          None,
    }

    return kfs


def format_kfs_text(kfs: dict) -> str:
    d  = kfs
    ld = d["loan_details"]
    cd = d["cost_details"]
    fc = d["fees_and_charges"]
    dr = d["disbursal_repayment"]
    ln = d["lender"]

    return f"""
╔══════════════════════════════════════════════════════════╗
║         KEY FACTS STATEMENT (KFS)                        ║
║         RBI Digital Lending Directions 2025              ║
╚══════════════════════════════════════════════════════════╝

Lender      : {ln['name']}
RBI Reg No  : {ln['rbi_registration']}
CIN         : {ln['cin']}
Borrower    : {d['borrower_name']}
Loan Type   : {d.get('loan_type','Personal Loan')}
Purpose     : {d['loan_purpose']}
Generated   : {d['generated_at']}

── LOAN DETAILS ──────────────────────────────────────────
Loan Amount        : ₹{ld['sanctioned_loan_amount_inr']:,.2f}
Amount Disbursed   : ₹{ld['disbursal_amount_inr']:,.2f}
Tenure             : {ld['tenure_months']} months
Type               : {ld['type']}
Collateral         : {ld.get('collateral_note','Not applicable')}

── COST OF LOAN ──────────────────────────────────────────
Annual Interest Rate : {cd['annual_interest_rate_pct']}% p.a.
APR (Effective)      : {cd['apr_pct']}% p.a.
Monthly EMI          : ₹{cd['emi_inr']:,.2f}
Total Repayment      : ₹{cd['total_repayment_inr']:,.2f}
Total Interest       : ₹{cd['total_interest_payable_inr']:,.2f}

── FEES AND CHARGES ──────────────────────────────────────
Processing Fee       : ₹{fc['processing_fee_inr']:,.2f} ({fc['processing_fee_pct']}%)
Prepayment Penalty   : {fc['prepayment_penalty']}
Late Payment Penalty : {fc['late_payment_penalty_per_month_pct']}% per month on overdue
Cheque Bounce        : ₹{fc['cheque_bounce_charge_inr']:,.0f} per instance
Loan Cancellation    : {fc['loan_cancellation_charge']}
Other Charges        : {fc['other_charges']}

── DISBURSAL ─────────────────────────────────────────────
Mode         : {dr['disbursal_mode']}
Repayment    : {dr['repayment_mode']}
First EMI    : {dr['first_emi_due']}

── YOUR RIGHTS ───────────────────────────────────────────
Cooling-off  : {d['borrower_rights']['cooling_off_period']}
Grievance    : {d['borrower_rights']['grievance_right']}
Data Rights  : {d['borrower_rights']['data_rights']}

Grievance Email : {ln['grievance_email']}
Grievance Phone : {ln['grievance_phone']}
RBI Sachet      : {ln['rbi_sachet_link']}
══════════════════════════════════════════════════════════
""".strip()