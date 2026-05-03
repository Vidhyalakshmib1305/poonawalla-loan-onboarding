"""
Bureau Service — Simulated CIBIL Bureau Pull
Built on real TransUnion CIBIL published statistics (2024).

Score tier definitions — official TransUnion CIBIL classification:
  Subprime   : 300–680
  Near Prime : 681–730
  Prime      : 731–770
  Prime Plus : 771–790
  Super Prime: 791–900

Source: TransUnion CIBIL "Empowering Financial Freedom" Report, August 2024
        RBI Deputy Governor address at CIBIL Credit Conference, July 2025

Loan sanction distribution (real):
  ~79% of all loans sanctioned go to borrowers with CIBIL 750+
  ~15% go to near-prime borrowers (681–749)
  ~6%  go to subprime (300–680) — mostly NBFCs at higher rates

Interest rate reality (real):
  Banks (SBI, HDFC, ICICI, Axis): require 700–720 min, offer 10–14% p.a.
  NBFCs (Bajaj Finance etc):      approve from 650, charge 16–24% p.a.

Note: Real CIBIL API requires RBI-licensed entity authorization.
This simulation is used for prototype/hackathon demonstration only.
Production: POST https://api.cibil.com/v3/creditreport with PAN + consent.
"""

import hashlib
import random
from datetime import date, timedelta
from services.risk_engine import BureauData


# ── Real CIBIL Score Band Definitions (TransUnion CIBIL Official) ─────────────

CIBIL_BANDS = {
    "super_prime": {
        "label": "Super Prime",
        "range": (791, 900),
        "official_tier": "Super Prime (791–900)",
        "loan_approval_rate": "Very High — preferred by all lenders",
        "typical_rate_bank": "10.5–11.5% p.a.",
        "typical_rate_nbfc": "11–13% p.a.",
        "population_share_pct": 28,   # ~28% of credit-active borrowers
    },
    "prime_plus": {
        "label": "Prime Plus",
        "range": (771, 790),
        "official_tier": "Prime Plus (771–790)",
        "loan_approval_rate": "High",
        "typical_rate_bank": "11.5–12.5% p.a.",
        "typical_rate_nbfc": "13–15% p.a.",
        "population_share_pct": 16,
    },
    "prime": {
        "label": "Prime",
        "range": (731, 770),
        "official_tier": "Prime (731–770)",
        "loan_approval_rate": "Good",
        "typical_rate_bank": "12.5–14% p.a.",
        "typical_rate_nbfc": "15–17% p.a.",
        "population_share_pct": 20,
    },
    "near_prime": {
        "label": "Near Prime",
        "range": (681, 730),
        "official_tier": "Near Prime (681–730)",
        "loan_approval_rate": "Moderate — selective lenders",
        "typical_rate_bank": "14–16% p.a. (if approved)",
        "typical_rate_nbfc": "17–20% p.a.",
        "population_share_pct": 18,
    },
    "subprime": {
        "label": "Subprime",
        "range": (300, 680),
        "official_tier": "Subprime (300–680)",
        "loan_approval_rate": "Low — NBFCs only, high rates",
        "typical_rate_bank": "Not typically approved",
        "typical_rate_nbfc": "20–28% p.a.",
        "population_share_pct": 18,
    },
}


def _score_band(score: int) -> str:
    for band, info in CIBIL_BANDS.items():
        lo, hi = info["range"]
        if lo <= score <= hi:
            return band
    return "subprime"


def _deterministic_int(pan_hash: int, lo: int, hi: int, salt: int = 0) -> int:
    """Generate a deterministic integer in [lo, hi] from PAN hash."""
    return lo + ((pan_hash + salt * 7919) % (hi - lo + 1))


def _build_payment_history(score: int, pan_hash: int) -> dict:
    """
    Generate realistic payment history based on score band.
    Uses real-world correlations between score and delinquency.
    """
    if score >= 791:
        # Super prime: near-perfect history
        missed = 0
        written_off = False
        settled = False
        dpd_90_plus = 0
    elif score >= 771:
        # Prime plus: maybe 1 minor miss in history
        missed = _deterministic_int(pan_hash, 0, 1, salt=1)
        written_off = False
        settled = False
        dpd_90_plus = 0
    elif score >= 731:
        # Prime: 0-2 missed, no write-off
        missed = _deterministic_int(pan_hash, 0, 2, salt=2)
        written_off = False
        settled = _deterministic_int(pan_hash, 0, 1, salt=3) == 1 and missed > 1
    elif score >= 681:
        # Near prime: some delinquency
        missed = _deterministic_int(pan_hash, 1, 4, salt=4)
        written_off = False
        settled = _deterministic_int(pan_hash, 0, 1, salt=5) == 1
        dpd_90_plus = _deterministic_int(pan_hash, 0, 1, salt=6)
    else:
        # Subprime: significant delinquency
        missed = _deterministic_int(pan_hash, 3, 8, salt=7)
        written_off = _deterministic_int(pan_hash, 0, 2, salt=8) == 0  # 33% chance
        settled = not written_off and _deterministic_int(pan_hash, 0, 1, salt=9) == 1
        dpd_90_plus = _deterministic_int(pan_hash, 1, 4, salt=10)

    return {
        "missed_payments_12m": missed,
        "written_off": written_off,
        "settled_accounts": settled,
        "dpd_90_plus_instances": locals().get("dpd_90_plus", 0),
    }


def _build_credit_accounts(score: int, pan_hash: int, monthly_income: float = 50000) -> dict:
    """
    Generate realistic loan account data correlated with score band.
    Higher score typically = more managed, lower outstanding ratio.
    """
    if score >= 791:
        active_loans = _deterministic_int(pan_hash, 0, 2, salt=11)
        utilization_ratio = _deterministic_int(pan_hash, 5, 25, salt=12) / 100
    elif score >= 731:
        active_loans = _deterministic_int(pan_hash, 1, 3, salt=13)
        utilization_ratio = _deterministic_int(pan_hash, 20, 40, salt=14) / 100
    elif score >= 681:
        active_loans = _deterministic_int(pan_hash, 1, 3, salt=15)
        utilization_ratio = _deterministic_int(pan_hash, 30, 55, salt=16) / 100
    else:
        active_loans = _deterministic_int(pan_hash, 2, 4, salt=17)
        utilization_ratio = _deterministic_int(pan_hash, 50, 80, salt=18) / 100

    # Outstanding amount relative to income (realistic: 0–30x monthly income)
    outstanding_multiplier = _deterministic_int(pan_hash, 2, 18, salt=19)
    total_outstanding = round(monthly_income * outstanding_multiplier, -3)

    # Existing EMI: roughly outstanding / (remaining tenure months)
    avg_remaining_tenure = _deterministic_int(pan_hash, 12, 48, salt=20)
    existing_emi = round(total_outstanding / max(avg_remaining_tenure, 1), -2) if active_loans > 0 else 0

    return {
        "active_loans": active_loans,
        "total_outstanding_inr": total_outstanding,
        "existing_monthly_emi_inr": existing_emi,
        "credit_utilization_pct": round(utilization_ratio * 100, 1),
    }


def _build_enquiry_data(score: int, pan_hash: int) -> dict:
    """
    Enquiry count inversely correlated with score.
    Many enquiries = credit hungry = score drops.
    """
    if score >= 791:
        enquiries_6m = _deterministic_int(pan_hash, 0, 2, salt=21)
    elif score >= 731:
        enquiries_6m = _deterministic_int(pan_hash, 1, 3, salt=22)
    elif score >= 681:
        enquiries_6m = _deterministic_int(pan_hash, 2, 5, salt=23)
    else:
        enquiries_6m = _deterministic_int(pan_hash, 4, 9, salt=24)

    return {
        "last_6_months": enquiries_6m,
        "last_12_months": enquiries_6m + _deterministic_int(pan_hash, 0, 3, salt=25),
    }


def _generate_score_from_pan(pan_hash: int) -> int:
    """
    Generate a CIBIL score using real population distribution weights.

    Real distribution (approximate, from CIBIL 2024 data + RBI reports):
      Super Prime  (791–900): ~28% of credit-active population
      Prime Plus   (771–790): ~16%
      Prime        (731–770): ~20%
      Near Prime   (681–730): ~18%
      Subprime     (300–680): ~18%

    Source: TransUnion CIBIL Annual Report 2024 distribution analysis
    """
    bucket = pan_hash % 100  # 0–99

    if bucket < 28:       # Super Prime — 28%
        return _deterministic_int(pan_hash, 791, 900, salt=30)
    elif bucket < 44:     # Prime Plus — 16%
        return _deterministic_int(pan_hash, 771, 790, salt=31)
    elif bucket < 64:     # Prime — 20%
        return _deterministic_int(pan_hash, 731, 770, salt=32)
    elif bucket < 82:     # Near Prime — 18%
        return _deterministic_int(pan_hash, 681, 730, salt=33)
    else:                 # Subprime — 18%
        return _deterministic_int(pan_hash, 520, 680, salt=34)
        # Floor at 520 — scores below this rarely appear in loan applicants
        # (people with 300-519 typically don't apply as they know they'll be rejected)


def fetch_bureau_data(pan_number: str, applicant_name: str = "",
                      monthly_income: float = 50000,
                      applicant_category: str = "salaried",
                      is_student: bool = False) -> dict:
    """
    Simulate a CIBIL bureau pull using real score distribution.
    Same PAN always returns same profile (deterministic via hash).

    Special handling:
    - Students / first-time borrowers → "NH" (No History) profile.
      In reality, a student's CIBIL would return -1 or "NH" if they've
      never taken a loan. Education loan decisions are based on the
      CO-APPLICANT (guardian)'s credit profile, not the student's.
      We simulate the guardian's profile as near-prime by default.
    - For all others: real population distribution (28% super-prime etc.)

    Production replacement:
        POST https://api.cibil.com/v3/creditreport
        Requires RBI-licensed entity + CIBIL member agreement + paid per-pull.
    """
    if not pan_number or len(pan_number) < 5:
        pan_number = "DUMMY00000D"

    pan_hash = int(hashlib.sha256(pan_number.upper().encode()).hexdigest(), 16)

    # ── Student / First-Time Borrower → No Credit History (NH) ──────────────
    # In production this PAN would return NH from CIBIL.
    # For education loans, we simulate the GUARDIAN's profile (who IS the
    # co-applicant) — guardians typically have an established credit history.
    if is_student or applicant_category == "student":
        # Guardian profile: simulate as near-prime to prime (realistic for
        # working parent of a student)
        cibil_score = _deterministic_int(pan_hash, 700, 780, salt=99)
        note = (
            "NH (No History) — Student applicant. "
            "Credit profile represents co-applicant (guardian/parent). "
            "Education loan decision is based on guardian's creditworthiness."
        )
        # Guardian: no write-offs, modest existing EMIs, 1-2 active loans
        payment_history = {
            "missed_payments_12m": 0,
            "written_off": False,
            "settled_accounts": False,
            "dpd_90_plus_instances": 0,
        }
        credit_accounts = {
            "active_loans": _deterministic_int(pan_hash, 0, 2, salt=100),
            "total_outstanding_inr": round(monthly_income * _deterministic_int(pan_hash, 2, 10, salt=101), -3),
            "existing_monthly_emi_inr": round(monthly_income * 0.15, -2),  # typical 15% FOIR for guardian
            "credit_utilization_pct": _deterministic_int(pan_hash, 15, 40, salt=102),
        }
        enquiries = {
            "last_6_months": _deterministic_int(pan_hash, 0, 2, salt=103),
            "last_12_months": _deterministic_int(pan_hash, 0, 3, salt=104),
        }
        credit_age_years = _deterministic_int(pan_hash, 3, 12, salt=105)
    else:
        note = (
            "Simulated using real TransUnion CIBIL score distribution (2024). "
            "Production requires RBI-licensed CIBIL API access."
        )
        cibil_score    = _generate_score_from_pan(pan_hash)
        payment_history = _build_payment_history(cibil_score, pan_hash)
        credit_accounts = _build_credit_accounts(cibil_score, pan_hash, monthly_income)
        enquiries       = _build_enquiry_data(cibil_score, pan_hash)
        if cibil_score >= 771:
            credit_age_years = _deterministic_int(pan_hash, 5, 15, salt=40)
        elif cibil_score >= 681:
            credit_age_years = _deterministic_int(pan_hash, 2, 8, salt=41)
        else:
            credit_age_years = _deterministic_int(pan_hash, 1, 5, salt=42)

    band      = _score_band(cibil_score)
    band_info = CIBIL_BANDS[band]
    oldest_account_date = (date.today() - timedelta(days=credit_age_years * 365)).strftime("%m/%Y")

    return {
        "status":          "success",
        "source":          "CIBIL_SIMULATED",
        "simulation_note": note,
        "pan":             f"{pan_number[:3]}XX{pan_number[-2:]}",
        "name_on_record":  applicant_name,
        "report_date":     date.today().strftime("%d/%m/%Y"),
        "report_id":       f"SIM{abs(pan_hash) % 10**10:010d}",
        "applicant_category": applicant_category,

        "cibil_score":   cibil_score,
        "score_version": "CIBIL Score V3 (300–900)",
        "score_band":    band_info["label"],
        "official_tier": band_info["official_tier"],

        "credit_accounts": credit_accounts,
        "payment_history": payment_history,
        "enquiries":       enquiries,
        "credit_age": {
            "years": credit_age_years,
            "oldest_account_opened": oldest_account_date,
        },

        "lender_guidance": {
            "bank_approval_likelihood": band_info["loan_approval_rate"],
            "typical_bank_rate":        band_info["typical_rate_bank"],
            "typical_nbfc_rate":        band_info["typical_rate_nbfc"],
            "population_in_this_band_pct":   band_info["population_share_pct"],
            "loans_sanctioned_750_plus_pct": 79,
        },
    }


def bureau_response_to_dataclass(bureau_response: dict) -> BureauData:
    """Convert bureau API response dict to BureauData dataclass for risk engine."""
    ca = bureau_response.get("credit_accounts", {})
    ph = bureau_response.get("payment_history", {})
    enq = bureau_response.get("enquiries", {})

    return BureauData(
        cibil_score=bureau_response.get("cibil_score", 0),
        active_loans=ca.get("active_loans", 0),
        total_outstanding=ca.get("total_outstanding_inr", 0),
        existing_monthly_emi=ca.get("existing_monthly_emi_inr", 0),
        missed_payments_12m=ph.get("missed_payments_12m", 0),
        written_off=ph.get("written_off", False),
        settled=ph.get("settled_accounts", False),
        enquiries_6m=enq.get("last_6_months", 0),
    )