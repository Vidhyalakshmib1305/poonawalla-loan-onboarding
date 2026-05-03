"""
Risk Engine — RBI Digital Lending Directions 2025 + Poonawalla Fincorp verified rates.
Expanded for all loan types and applicant categories (Points 4+5).

Real rate data (verified from Poonawalla Fincorp official platform):
- Personal Loan:       from 9.99% p.a., up to ₹30L, processing up to 2%
- Business Loan:       from 15% p.a., up to ₹50L, processing up to 3%
- Professional Loan:   from 13% p.a., up to ₹75L, processing up to 3%, no prepay penalty
- Home Loan:           from 9.55% (8.75% women), processing up to 1%
- LAP:                 from 9% p.a., up to ₹10Cr, tenure up to 15 years, LTV 75% residential
- Medical Equipment:   from 9.99%, up to ₹10Cr, tenure up to 84 months
- Pre-Owned Car:       up to ₹75L, up to 100% of car value
- Gold Loan:           RBI 2025 LTV tiers: ≤2.5L→85%, 2.5-5L→80%, >5L→75%
- Education:           RBI collateral rules: <4L no collateral, 4-7.5L guarantor, >7.5L tangible
"""

import math
from dataclasses import dataclass, field
from typing import Optional


# ─── Loan Type Policies (real Poonawalla Fincorp data) ───────────────────────

LOAN_POLICIES = {
    "personal": {
        "display_name":       "Personal Loan",
        "min_rate":           9.99,  "rate_excellent": 10.5, "rate_good": 12.5,
        "rate_standard":      15.0,  "rate_marginal":  18.0,
        "max_amount":         3_000_000,  "min_amount": 50_000,
        "max_tenure_months":  60,         "min_tenure_months": 12,
        "processing_fee_pct": 0.02,
        "collateral":         "none",
        "min_income":         25_000,
        "prepayment_note":    "NIL after 12 EMIs",
    },
    "instant_personal": {
        "display_name":       "Instant Personal Loan",
        "min_rate":           9.99,  "rate_excellent": 10.5, "rate_good": 12.5,
        "rate_standard":      15.0,  "rate_marginal":  18.0,
        "max_amount":         500_000,   "min_amount": 50_000,
        "max_tenure_months":  36,        "min_tenure_months": 6,
        "processing_fee_pct": 0.01,
        "collateral":         "none",
        "min_income":         20_000,
        "prepayment_note":    "NIL after 6 EMIs",
    },
    "business": {
        "display_name":       "Business Loan",
        "min_rate":           15.0,  "rate_excellent": 15.0, "rate_good": 17.0,
        "rate_standard":      19.0,  "rate_marginal":  22.0,
        "max_amount":         5_000_000,  "min_amount": 100_000,
        "max_tenure_months":  60,         "min_tenure_months": 12,
        "processing_fee_pct": 0.03,
        "collateral":         "none",
        "min_income":         0,
        "prepayment_note":    "NIL — no hidden charges",
    },
    "professional": {
        "display_name":       "Professional Loan",
        "min_rate":           13.0,  "rate_excellent": 13.0, "rate_good": 14.5,
        "rate_standard":      16.0,  "rate_marginal":  18.0,
        "max_amount":         7_500_000,  "min_amount": 100_000,
        "max_tenure_months":  60,         "min_tenure_months": 12,
        "processing_fee_pct": 0.03,
        "collateral":         "none",
        "min_income":         30_000,
        "prepayment_note":    "NIL if paid from own sources (no bank loan takeover)",
        "eligible_professionals": ["CA", "Doctor", "CS", "Architect", "Engineer"],
    },
    "home": {
        "display_name":       "Home Loan",
        "min_rate":           9.55,  "rate_excellent": 9.55, "rate_good": 10.0,
        "rate_standard":      10.75, "rate_marginal":  11.5,
        "women_rate":         8.75,
        "max_amount":         None,  # no cap stated
        "min_amount":         500_000,
        "max_tenure_months":  360,   "min_tenure_months": 60,
        "processing_fee_pct": 0.01,
        "collateral":         "property",
        "min_income":         0,
        "max_age_at_maturity":70,
        "prepayment_note":    "NIL for floating rate per RBI mandate",
    },
    "education_domestic": {
        "display_name":       "Education Loan (Domestic)",
        "min_rate":           10.0,  "rate_excellent": 10.0, "rate_good": 11.0,
        "rate_standard":      12.0,  "rate_marginal":  13.0,
        "max_amount":         2_000_000,  "min_amount": 50_000,
        "max_tenure_months":  84,         "min_tenure_months": 12,
        "processing_fee_pct": 0.01,
        "collateral":         "rbi_education_rules",
        "min_income":         0,           # uses co-applicant income
        "margin_pct":         0.05,        # 5% margin for domestic
        "use_co_applicant":   True,
        "collateral_rule": {
            "no_collateral_limit":  400_000,
            "guarantor_limit":      750_000,
            # above 750k → tangible collateral
        },
        "prepayment_note": "NIL — student loan",
    },
    "education_international": {
        "display_name":       "Education Loan (International)",
        "min_rate":           10.5,  "rate_excellent": 10.5, "rate_good": 11.5,
        "rate_standard":      12.5,  "rate_marginal":  14.0,
        "max_amount":         5_000_000,  "min_amount": 200_000,
        "max_tenure_months":  84,         "min_tenure_months": 12,
        "processing_fee_pct": 0.01,
        "collateral":         "required_above_750k",
        "min_income":         0,
        "margin_pct":         0.15,        # 15% margin for international
        "use_co_applicant":   True,
        "prepayment_note": "NIL — student loan",
    },
    "lap": {
        "display_name":       "Loan Against Property",
        "min_rate":           9.0,   "rate_excellent": 9.0, "rate_good": 10.0,
        "rate_standard":      11.0,  "rate_marginal":  12.5,
        "max_amount":         100_000_000,  "min_amount": 500_000,
        "max_tenure_months":  180,           "min_tenure_months": 12,
        "processing_fee_pct": 0.01,
        "collateral":         "property",
        "min_income":         0,
        "ltv_residential":    0.75,  # RBI cap: 75% LTV for residential
        "ltv_commercial":     0.60,
        "prepayment_note":    "NIL after 12 EMIs",
    },
    "medical_equipment": {
        "display_name":       "Medical Equipment Loan",
        "min_rate":           9.99,  "rate_excellent": 9.99, "rate_good": 11.0,
        "rate_standard":      12.0,  "rate_marginal":  13.5,
        "max_amount":         100_000_000,  "min_amount": 500_000,
        "max_tenure_months":  84,            "min_tenure_months": 12,
        "processing_fee_pct": 0.01,
        "collateral":         "equipment",   # hypothecation of equipment
        "min_income":         0,
        "prepayment_note":    "NIL after 12 EMIs",
    },
    "pre_owned_car": {
        "display_name":       "Pre-Owned Car Loan",
        "min_rate":           12.0,  "rate_excellent": 12.0, "rate_good": 13.5,
        "rate_standard":      15.0,  "rate_marginal":  18.0,
        "max_amount":         7_500_000,  "min_amount": 100_000,
        "max_tenure_months":  60,         "min_tenure_months": 12,
        "processing_fee_pct": 0.02,
        "collateral":         "vehicle",
        "max_ltv":            1.0,   # up to 100% of car value
        "max_car_age_years":  10,    # car must not be more than 10 years old at loan end
        "min_income":         20_000,
        "prepayment_note":    "NIL after 12 EMIs",
    },
    "gold": {
        "display_name":       "Gold Loan",
        "min_rate":           9.99,  "rate_excellent": 9.99, "rate_good": 10.5,
        "rate_standard":      11.5,  "rate_marginal":  13.0,
        "max_amount":         None,  # determined by gold value × LTV
        "min_amount":         10_000,
        "max_tenure_months":  12,    "min_tenure_months": 3,
        "processing_fee_pct": 0.01,
        "collateral":         "gold",
        "min_income":         0,
        # RBI 2025 Gold Loan LTV tiers
        "ltv_tiers": [
            (250_000,  0.85),   # loan ≤ ₹2.5L: max 85% LTV
            (500_000,  0.80),   # loan ₹2.5L-₹5L: max 80% LTV
            (None,     0.75),   # loan > ₹5L: max 75% LTV
        ],
        "gold_purity_benchmark_carats": 22,  # benchmarked to 22-carat per RBI
        "prepayment_note": "NIL",
    },
    "consumer_durable": {
        "display_name":       "Consumer Durable Loan",
        "min_rate":           0.0,   "rate_excellent": 0.0, "rate_good": 0.0,
        "rate_standard":      9.0,   "rate_marginal":  12.0,
        "max_amount":         500_000,   "min_amount": 10_000,
        "max_tenure_months":  24,        "min_tenure_months": 3,
        "processing_fee_pct": 0.0,
        "collateral":         "product",
        "min_income":         0,
        "prepayment_note":    "NIL",
    },
    "commercial_vehicle": {
        "display_name":       "Commercial Vehicle Loan",
        "min_rate":           12.0,  "rate_excellent": 12.0, "rate_good": 13.5,
        "rate_standard":      15.0,  "rate_marginal":  18.0,
        "max_amount":         5_000_000,  "min_amount": 200_000,
        "max_tenure_months":  84,         "min_tenure_months": 12,
        "processing_fee_pct": 0.02,
        "collateral":         "vehicle",
        "min_income":         0,
        "prepayment_note":    "NIL after 12 EMIs",
    },
}

# ─── Global RBI Policy (applies to all loan types) ───────────────────────────

GLOBAL_POLICY = {
    "min_age":                 21,
    "max_age_at_maturity":     60,   # overridden by loan-type (e.g. home loan uses 70)
    "foir_hard_reject":        0.50,
    "foir_amber":              0.40,
    "score_hard_reject":       650,
    "score_marginal":          700,
    "score_standard":          750,
    "score_good":              800,
    "max_bureau_enquiries_6m": 5,
    "age_mismatch_threshold":  10,   # Soft warning only (see fraud check section). Hard flag: >20yr.
    "metro_cities": [
        "mumbai","delhi","bengaluru","bangalore","chennai",
        "hyderabad","pune","kolkata","ahmedabad","surat",
    ],
}


# ─── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class BureauData:
    cibil_score:          int
    active_loans:         int
    total_outstanding:    float
    existing_monthly_emi: float
    missed_payments_12m:  int
    written_off:          bool
    settled:              bool
    enquiries_6m:         int


@dataclass
class ApplicantData:
    name:                    str
    dob_year:                int
    dob_month:               int
    dob_day:                 int
    declared_city:           str
    employer:                str
    employment_type:         str
    years_experience:        float
    monthly_income:          float
    loan_purpose:            str
    loan_amount_requested:   float
    tenure_requested_months: int
    verbal_consent:          bool
    estimated_age:           Optional[int]   = None
    face_match_score:        Optional[float] = None
    liveness_passed:         bool            = False
    ip_city:                 Optional[str]   = None
    gps_lat:                 Optional[float] = None
    gps_lng:                 Optional[float] = None
    # Category / type (from selector + LLM)
    applicant_category:      str             = "salaried"
    loan_type:               str             = "personal"
    # Professional fields
    professional_registration_number: Optional[str] = None
    professional_body:       Optional[str]   = None
    # Gender (for home loan women rate)
    gender:                  Optional[str]   = None


@dataclass
class CoApplicantData:
    """For education loans and entrepreneur LAP — co-applicant/guarantor income."""
    name:           str
    relationship:   str             # parent / spouse / guarantor
    monthly_income: float
    cibil_score:    Optional[int]   = None
    employment_type: str            = "salaried"


@dataclass
class PropertyData:
    """For LAP and home loans."""
    estimated_value:    float
    property_type:      str         # residential / commercial
    ownership:          str         # own / spouse / parent / business
    encumbrance_clear:  bool        = True


@dataclass
class GoldData:
    """For gold loans — per RBI 2025 LTV tiers."""
    weight_grams:    float
    purity_carats:   int            # should be benchmarked at 22 carats per RBI
    estimated_value: float          # at 22-carat benchmark rate


@dataclass
class VehicleData:
    """For pre-owned car and commercial vehicle loans."""
    make_model:         str
    year_of_manufacture: int
    estimated_value:    float
    rc_available:       bool = True


@dataclass
class RiskResult:
    decision:              str
    rejection_reasons:     list = field(default_factory=list)
    fraud_flags:           list = field(default_factory=list)
    warnings:              list = field(default_factory=list)
    risk_band:             str  = ""
    cibil_band:            str  = ""
    foir_before:           float = 0.0
    foir_after:            float = 0.0
    eligible_loan_amount:  float = 0.0
    approved_loan_amount:  float = 0.0
    interest_rate:         float = 0.0
    tenure_months:         int   = 0
    emi:                   float = 0.0
    processing_fee:        float = 0.0
    apr:                   float = 0.0
    total_repayment:       float = 0.0
    score_breakdown:       dict  = field(default_factory=dict)
    collateral_note:       str   = ""
    ltv_applied:           Optional[float] = None
    loan_type_display:     str   = ""


# ─── Utility Functions ────────────────────────────────────────────────────────

def calculate_age(dob_year: int, dob_month: int, dob_day: int) -> int:
    from datetime import date
    today = date.today()
    return today.year - dob_year - ((today.month, today.day) < (dob_month, dob_day))


def calculate_emi(principal: float, annual_rate: float, months: int) -> float:
    if months <= 0:
        return 0.0
    if annual_rate <= 0:
        return round(principal / months, 2)
    r = annual_rate / (12 * 100)
    emi = principal * r * (1 + r) ** months / ((1 + r) ** months - 1)
    return round(emi, 2)


def calculate_apr(principal: float, emi: float, months: int, processing_fee: float) -> float:
    """APR via Newton-Raphson — mandatory RBI KFS disclosure."""
    net_disbursed = principal - processing_fee
    if net_disbursed <= 0 or months <= 0:
        return 0.0
    r = 0.01
    for _ in range(1000):
        f  = net_disbursed * r * (1+r)**months / ((1+r)**months - 1) - emi
        df = net_disbursed * ((1+r)**months * (1+r*months) - (1+r)**months + 1) / ((1+r)**months - 1)**2
        r_new = r - f / df if df != 0 else r
        if abs(r_new - r) < 1e-8:
            break
        r = r_new
    return round(r * 12 * 100, 2)


def get_interest_rate(policy: dict, cibil_score: int, foir_before: float,
                      gender: str = None) -> float:
    """Select rate from policy based on credit profile. Women get home loan discount."""
    if policy.get("women_rate") and gender and gender.upper() == "FEMALE":
        return policy["women_rate"]
    if cibil_score >= GLOBAL_POLICY["score_good"] and foir_before <= 0.30:
        return policy["rate_excellent"]
    elif cibil_score >= GLOBAL_POLICY["score_standard"]:
        return policy["rate_good"]
    elif cibil_score >= GLOBAL_POLICY["score_marginal"]:
        return policy["rate_standard"]
    else:
        return policy["rate_marginal"]


def get_cibil_band(score: int) -> str:
    if score >= 800: return "EXCELLENT"
    elif score >= 750: return "GOOD"
    elif score >= 700: return "STANDARD"
    elif score >= 650: return "MARGINAL"
    else: return "POOR"


def get_gold_ltv(loan_amount: float, policy: dict) -> float:
    """RBI 2025 tiered LTV for gold loans."""
    for (limit, ltv) in policy["ltv_tiers"]:
        if limit is None or loan_amount <= limit:
            return ltv
    return 0.75


# ─── Main Risk Engine ─────────────────────────────────────────────────────────

def run_risk_engine(
    applicant:     ApplicantData,
    bureau:        BureauData,
    co_applicant:  Optional[CoApplicantData] = None,
    property_data: Optional[PropertyData]    = None,
    gold_data:     Optional[GoldData]        = None,
    vehicle_data:  Optional[VehicleData]     = None,
) -> RiskResult:
    """
    Unified risk engine for all loan types.
    Selects the right policy, applies loan-type-specific rules,
    then runs the standard FOIR + eligibility calculation.
    """
    loan_type = applicant.loan_type or "personal"
    policy    = LOAN_POLICIES.get(loan_type, LOAN_POLICIES["personal"])
    result    = RiskResult(decision="pending", loan_type_display=policy["display_name"])
    rejections, fraud_flags, warnings = [], [], []

    # ── 1. FRAUD CHECKS ───────────────────────────────────────────────────────

    if not applicant.liveness_passed:
        fraud_flags.append("LIVENESS_FAILED: Customer did not pass liveness verification")

    if applicant.face_match_score is not None and applicant.face_match_score < 0.38:
        fraud_flags.append(
            f"FACE_MISMATCH: Similarity {applicant.face_match_score:.2f} < 0.38 threshold"
        )

    if applicant.estimated_age is not None:
        doc_age = calculate_age(applicant.dob_year, applicant.dob_month, applicant.dob_day)
        age_diff = abs(applicant.estimated_age - doc_age)

        # Age estimation accuracy context:
        # - DeepFace has documented ±5-7 year error margin on South Asian faces
        # - Aadhaar DOB OCR can misread digits (e.g. 2003 -> 1988 = 15yr error)
        # - AGE_MISMATCH is a WARNING for manual review, NEVER a hard fraud rejection
        # - Only hard fraud flag if >20yr gap (clearly different person, not estimation error)
        # Age estimation NEVER goes in fraud_flags — DeepFace has documented ±8-15yr error
        # on South Asian faces with glasses under webcam lighting. Combined with possible
        # Aadhaar DOB OCR errors, the total error margin can exceed 20 years for a genuine user.
        # Aadhaar DOB (used in calculate_age() for eligibility) is the authoritative age.
        # Face estimation is audit-trail note only.
        if age_diff > 15:
            warnings.append(
                f"AGE_NOTE: Face estimated {applicant.estimated_age}yrs vs Aadhaar DOB age {doc_age}yrs "
                f"({age_diff}yr gap). Advisory only — DeepFace has ±8-15yr error on South Asian faces. "
                f"Aadhaar DOB is authoritative. This is NOT a rejection reason."
            )
        # <15yr gap: within normal error margin — no note needed

    if bureau.written_off:
        fraud_flags.append("BUREAU_WRITEOFF: Previous loan written off")
    if bureau.enquiries_6m > GLOBAL_POLICY["max_bureau_enquiries_6m"]:
        fraud_flags.append(
            f"CREDIT_HUNGRY: {bureau.enquiries_6m} enquiries in 6 months"
        )

    if fraud_flags:
        result.fraud_flags = fraud_flags
        result.decision = "rejected"
        result.rejection_reasons = ["FRAUD_FLAGS_RAISED: Application rejected — fraud signals detected"]
        return result

    # ── 2. HARD ELIGIBILITY GATES ─────────────────────────────────────────────

    applicant_age = calculate_age(applicant.dob_year, applicant.dob_month, applicant.dob_day)
    max_age       = policy.get("max_age_at_maturity", GLOBAL_POLICY["max_age_at_maturity"])
    age_at_maturity = applicant_age + (applicant.tenure_requested_months // 12)

    if applicant_age < GLOBAL_POLICY["min_age"]:
        rejections.append(f"AGE_TOO_YOUNG: Age {applicant_age} < minimum {GLOBAL_POLICY['min_age']}")
    if age_at_maturity > max_age:
        rejections.append(
            f"AGE_AT_MATURITY: Age at loan end {age_at_maturity} > maximum {max_age}"
        )

    if not applicant.verbal_consent:
        rejections.append("NO_CONSENT: Verbal consent not captured")

    if bureau.cibil_score < GLOBAL_POLICY["score_hard_reject"]:
        rejections.append(
            f"CREDIT_SCORE_LOW: CIBIL {bureau.cibil_score} < minimum {GLOBAL_POLICY['score_hard_reject']}"
        )

    # Income check — education loans use co-applicant income
    effective_income = applicant.monthly_income
    if policy.get("use_co_applicant") and co_applicant:
        effective_income = co_applicant.monthly_income
        warnings.append(
            f"CO_APPLICANT_INCOME: Using co-applicant ({co_applicant.name}) "
            f"income ₹{co_applicant.monthly_income:,.0f}/mo for FOIR"
        )
    elif policy.get("use_co_applicant") and not co_applicant:
        rejections.append(
            "CO_APPLICANT_REQUIRED: Education loan requires a co-applicant (parent/guardian) "
            "with income proof. Please provide co-applicant details."
        )

    min_income = policy.get("min_income", 25_000)
    if min_income > 0 and effective_income < min_income:
        rejections.append(
            f"INCOME_INSUFFICIENT: Income ₹{effective_income:,.0f} < minimum ₹{min_income:,.0f}"
        )

    # Professional loan: require registration proof
    if loan_type == "professional":
        if not applicant.professional_registration_number:
            warnings.append(
                "PROF_REG_UNVERIFIED: Professional registration number not captured in video call. "
                "Officer must verify Certificate of Practice before disbursal."
            )

    # Gold loan: require gold data
    if loan_type == "gold":
        if not gold_data:
            rejections.append(
                "GOLD_DATA_MISSING: Gold weight and purity must be stated during video call "
                "for gold loan assessment."
            )

    # LAP: require property data
    if loan_type in ("lap", "home"):
        if not property_data:
            warnings.append(
                "PROPERTY_DATA_MISSING: Property valuation data not provided. "
                "LTV cannot be verified — manual property assessment required."
            )

    # Education collateral rules (RBI)
    if loan_type == "education_domestic":
        amount = applicant.loan_amount_requested
        rule   = policy.get("collateral_rule", {})
        no_col_limit  = rule.get("no_collateral_limit", 400_000)
        guarantor_lim = rule.get("guarantor_limit", 750_000)
        if amount <= no_col_limit:
            result.collateral_note = "No collateral required (RBI: domestic education loan ≤ ₹4L)"
        elif amount <= guarantor_lim:
            result.collateral_note = "Guarantor required (RBI: domestic education loan ₹4L–₹7.5L)"
        else:
            result.collateral_note = (
                "Tangible collateral required (RBI: domestic education loan > ₹7.5L). "
                "NBFC policy may vary — verify with lender."
            )

    if bureau.settled:
        warnings.append("SETTLED_ACCOUNT: Previous settled loan — may affect rate")
    if bureau.missed_payments_12m > 0:
        warnings.append(f"MISSED_PAYMENTS: {bureau.missed_payments_12m} missed payment(s) last 12m")

    if rejections:
        result.decision = "rejected"
        result.rejection_reasons = rejections
        result.warnings = warnings
        result.fraud_flags = fraud_flags
        return result

    # ── 3. ELIGIBLE AMOUNT CALCULATION ────────────────────────────────────────

    interest_rate = get_interest_rate(policy, bureau.cibil_score,
                                      bureau.existing_monthly_emi / max(effective_income, 1),
                                      applicant.gender)
    max_tenure = policy["max_tenure_months"]
    min_tenure = policy["min_tenure_months"]
    tenure = max(min_tenure, min(applicant.tenure_requested_months, max_tenure))
    max_amount = policy["max_amount"] or 100_000_000
    min_amount = policy["min_amount"]

    # ── Gold loan: amount determined by gold value × LTV ──────────────────────
    if loan_type == "gold" and gold_data:
        req_amount = applicant.loan_amount_requested
        ltv        = get_gold_ltv(req_amount, policy)
        max_by_gold = math.floor(gold_data.estimated_value * ltv / 1000) * 1000
        eligible_amount = min(req_amount, max_by_gold)
        result.ltv_applied = ltv
        result.collateral_note = (
            f"Gold LTV: {ltv*100:.0f}% (RBI 2025) · "
            f"Max eligible: ₹{max_by_gold:,.0f} on ₹{gold_data.estimated_value:,.0f} gold value"
        )

    # ── LAP: amount limited by LTV on property value ──────────────────────────
    elif loan_type == "lap" and property_data:
        ltv = (policy["ltv_residential"] if property_data.property_type == "residential"
               else policy["ltv_commercial"])
        max_by_ltv = math.floor(property_data.estimated_value * ltv / 10000) * 10000
        foir_headroom = (GLOBAL_POLICY["foir_hard_reject"] - bureau.existing_monthly_emi / max(effective_income, 1)) * effective_income
        lo, hi = min_amount, min(max_by_ltv, max_amount)
        eligible_amount = lo
        for _ in range(50):
            mid = (lo + hi) / 2
            if calculate_emi(mid, interest_rate, tenure) <= foir_headroom:
                eligible_amount = mid; lo = mid
            else:
                hi = mid
        eligible_amount = math.floor(eligible_amount / 10000) * 10000
        result.ltv_applied = ltv
        result.collateral_note = (
            f"LAP LTV: {ltv*100:.0f}% ({property_data.property_type}) · "
            f"Max by LTV: ₹{max_by_ltv:,.0f}"
        )

    # ── Standard FOIR-based eligibility (personal, business, professional, etc.) ──
    else:
        foir_before = bureau.existing_monthly_emi / max(effective_income, 1)
        foir_headroom = (GLOBAL_POLICY["foir_hard_reject"] - foir_before) * effective_income

        if foir_headroom <= 0:
            result.decision = "rejected"
            result.rejection_reasons = [
                f"FOIR_EXCEEDED: Current FOIR {foir_before:.1%} already at/above 50% RBI limit"
            ]
            return result

        lo, hi = min_amount, min(effective_income * 30, max_amount)
        eligible_amount = lo
        for _ in range(50):
            mid = (lo + hi) / 2
            if (bureau.existing_monthly_emi + calculate_emi(mid, interest_rate, tenure)) / max(effective_income, 1) <= GLOBAL_POLICY["foir_hard_reject"]:
                eligible_amount = mid; lo = mid
            else:
                hi = mid
        eligible_amount = math.floor(eligible_amount / 1000) * 1000

    # ── 4. OFFER COMPUTATION ──────────────────────────────────────────────────

    approved_amount = min(applicant.loan_amount_requested, eligible_amount, max_amount)
    approved_amount = max(approved_amount, min_amount)

    if approved_amount < min_amount:
        result.decision = "rejected"
        result.rejection_reasons = [f"AMOUNT_TOO_LOW: Eligible ₹{eligible_amount:,.0f} < minimum ₹{min_amount:,.0f}"]
        return result

    final_emi      = calculate_emi(approved_amount, interest_rate, tenure)
    foir_after     = (bureau.existing_monthly_emi + final_emi) / max(effective_income, 1)
    processing_fee = round(approved_amount * policy["processing_fee_pct"], 2)
    total_repayment = round(final_emi * tenure + processing_fee, 2)
    apr            = calculate_apr(approved_amount, final_emi, tenure, processing_fee)
    foir_before_val = bureau.existing_monthly_emi / max(effective_income, 1)

    if foir_after > GLOBAL_POLICY["foir_amber"] and loan_type not in ("gold", "lap", "home"):
        warnings.append(f"FOIR_AMBER: Projected FOIR {foir_after:.1%} — above preferred 40%")

    # ── 5. RISK BAND ──────────────────────────────────────────────────────────

    if bureau.cibil_score >= 800 and foir_after <= 0.35 and bureau.missed_payments_12m == 0:
        risk_band = "A"
    elif bureau.cibil_score >= 750 and foir_after <= 0.45:
        risk_band = "B"
    elif bureau.cibil_score >= 700 and foir_after <= 0.50:
        risk_band = "C"
    else:
        risk_band = "D"

    # ── 6. RESULT ─────────────────────────────────────────────────────────────

    result.decision              = "approved"
    result.fraud_flags           = fraud_flags
    result.warnings              = warnings
    result.rejection_reasons     = []
    result.risk_band             = risk_band
    result.cibil_band            = get_cibil_band(bureau.cibil_score)
    result.foir_before           = round(foir_before_val, 4)
    result.foir_after            = round(foir_after, 4)
    result.eligible_loan_amount  = eligible_amount
    result.approved_loan_amount  = approved_amount
    result.interest_rate         = interest_rate
    result.tenure_months         = tenure
    result.emi                   = final_emi
    result.processing_fee        = processing_fee
    result.apr                   = apr
    result.total_repayment       = total_repayment
    result.score_breakdown = {
        "cibil_score":           bureau.cibil_score,
        "cibil_band":            get_cibil_band(bureau.cibil_score),
        "foir_before_pct":       f"{foir_before_val:.1%}",
        "foir_after_pct":        f"{foir_after:.1%}",
        "risk_band":             risk_band,
        "loan_type":             loan_type,
        "applicant_category":    applicant.applicant_category,
        "age":                   applicant_age,
        "active_loans":          bureau.active_loans,
        "missed_payments_12m":   bureau.missed_payments_12m,
        "enquiries_6m":          bureau.enquiries_6m,
        "effective_income_used": effective_income,
    }
    return result


# Kept for backward compat
def calculate_emi_export(p, r, n): return calculate_emi(p, r, n)
POLICY = {**GLOBAL_POLICY, **LOAN_POLICIES["personal"]}  # legacy alias