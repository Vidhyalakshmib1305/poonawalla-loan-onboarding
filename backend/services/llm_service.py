"""
Groq LLM Service — extracts structured loan application data from video call transcript.
Expanded to extract loan-type-specific fields for Points 4+5:
- applicant_category, loan_type (explicit or inferred)
- professional registration, professional body
- guardian/co-applicant income (for students)
- gold weight/purity, property ownership, vehicle details
- course/institution for education loans
- employer cross-check field
"""

import json
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

EXTRACTION_SYSTEM_PROMPT = """
You are a data extraction engine for a digital loan onboarding system in India (Poonawalla Fincorp).
Your ONLY job is to extract structured information from a loan application video call transcript.

═══ CRITICAL RULES ═══
1. Return ONLY valid JSON. No explanations, no markdown, no code blocks.
2. If a field is not mentioned, return null for that field.
3. Do NOT invent data. Extract ONLY what is explicitly stated.
4. All money amounts must be in Indian Rupees as plain integers.

═══ INDIAN NUMBER CONVERSION (MANDATORY) ═══
You MUST convert Indian number words to integers before returning:
- "2 lakh" = 200000
- "4 lakh" = 400000
- "10 lakh" = 1000000
- "1 crore" = 10000000
- "85,000" = 85000
- "85 thousand" = 85000
- "eighty five thousand" = 85000
Examples in context:
  "income of 85,000 rupees" → 85000
  "loan of 2 lakh rupees" → 200000
  "course fee is 4 lakh" → 400000
  "salary is 1.5 LPA" → 125000 (divide by 12)

═══ VERBAL CONSENT (CRITICAL — READ CAREFULLY) ═══
verbal_consent = TRUE if ANY of these phrases appear (or close variations):
  - "I give my consent"
  - "I consent to proceed"
  - "we both give full consent"
  - "I give full consent"
  - "both give consent to proceed"
  - "I agree to proceed"
  - "please proceed"
  - "yes I consent"
  - "full consent to proceed"
verbal_consent = FALSE only if none of these appear at all.
THE PHRASE "We both give full consent to proceed" MUST set verbal_consent = true.

═══ EDUCATION LOAN PATTERNS ═══
For education loans, the STUDENT speaks. Listen for:
- Student name: "I am [name]" or "my name is [name]"
- Institution: "admitted to [college]" or "studying at [college]"
- Course: "for [course name]" or "pursuing [course]"
- Guardian: "my parent is [name]" or "my father is [name]" or "my mother is [name]"
- Guardian employer: "[parent name] works at [company]" or "working at [company]"
- Guardian income: "monthly income of [amount]" (in context of parent/guardian)
  → This goes into guardian_income, NOT monthly_income
- Loan amount: "education loan of [amount]" or "need [amount] for studies"
- Course fee: "total fee is [amount]" or "cost is [amount]" → put in loan_purpose context

IMPORTANT: For education loans, monthly_income refers to the STUDENT's income (usually 0).
The parent/guardian income goes into guardian_income.
If the transcript says "monthly income of 85,000" in context of describing the parent → guardian_income = 85000.

═══ LOAN TYPES (use exact strings) ═══
personal, instant_personal, business, professional, home,
education_domestic, education_international, lap,
gold, pre_owned_car, medical_equipment, consumer_durable, commercial_vehicle

═══ APPLICANT CATEGORIES (use exact strings) ═══
salaried, self_employed, professional, student, entrepreneur, nri

═══ EXTRACTION EXAMPLE (Education Loan) ═══
Transcript: "Hi I am Vidya Lakshmi. Admitted to SRM Easwari Engineering College for
BTEC Artificial Intelligence and Data Science. My parent is Balaji Narayanan who works
at DXI Technologies with a monthly income of 85,000 rupees. The total course fee is
4 lakh rupees. We need an education loan of 2 lakh rupees. We both give full consent to proceed."

Correct extraction:
{
  "name": "Vidya Lakshmi",
  "institution_name": "SRM Easwari Engineering College",
  "course_name": "BTEC Artificial Intelligence and Data Science",
  "guardian_name": "Balaji Narayanan",
  "employer": "DXI Technologies",
  "guardian_income": 85000,
  "loan_amount_requested": 200000,
  "loan_purpose": "Education — course fee 4 lakh rupees",
  "loan_type": "education_domestic",
  "applicant_category": "student",
  "is_student": true,
  "study_destination": "domestic",
  "verbal_consent": true,
  "monthly_income": 0
}

═══ RETURN THIS JSON STRUCTURE ═══
{
  "name": "string — applicant's name",
  "employer": "string — company name (or guardian's employer for education loans)",
  "employment_type": "salaried or self_employed or null",
  "applicant_category": "one of the category strings above or null",
  "loan_type": "one of the loan type strings above or null",
  "years_experience": number or null,
  "monthly_income": number or null,
  "loan_purpose": "string",
  "loan_amount_requested": number or null,
  "tenure_requested_months": number or null,
  "declared_city": "string or null",
  "verbal_consent": true or false,

  "professional_registration_number": "string or null",
  "professional_body": "string or null",

  "is_student": true or false or null,
  "course_name": "string or null",
  "institution_name": "string or null",
  "study_destination": "domestic or international or null",
  "guardian_name": "string or null",
  "guardian_income": number or null,

  "property_ownership": "own or spouse or parent or business or null",
  "property_type": "residential or commercial or null",
  "property_estimated_value": number or null,

  "gold_weight_grams": number or null,
  "gold_purity_carats": number or null,

  "vehicle_make_model": "string or null",
  "vehicle_estimated_value": number or null,

  "business_vintage_years": number or null,
  "has_guarantor": true or false or null,

  "confidence_notes": "brief note on any ambiguous extractions"
}
"""


def extract_loan_data_from_transcript(transcript: str) -> dict:
    """
    Send transcript to Groq LLM and extract all structured loan application fields.
    Returns parsed dict.
    """
    if not transcript or len(transcript.strip()) < 10:
        return _empty_extraction()

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user",   "content": f"TRANSCRIPT:\n{transcript}"}
            ],
            temperature=0.0,
            max_tokens=800,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw.strip())
        return _validate_extraction(data)

    except json.JSONDecodeError as e:
        print(f"[LLM] JSON parse error: {e}")
        return _empty_extraction()
    except Exception as e:
        print(f"[LLM] Groq API error: {e}")
        return _empty_extraction()


def classify_risk_persona(extracted_data: dict, risk_result: dict) -> str:
    """Secondary LLM call — returns a one-line persona string for audit/display."""
    prompt = f"""
You are a credit analyst. Given this loan applicant profile, return ONLY JSON:
{{
  "persona": "one of: Young Professional / Established Salaried / Self-Employed Stable / Student Applicant / High-Risk Borrower / Conservative Borrower / NRI Applicant / Business Owner"
}}

Applicant: {json.dumps(extracted_data, indent=2)}
Risk: {json.dumps(risk_result, indent=2)}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip()).get("persona", "Unknown")
    except Exception as e:
        print(f"[LLM] Persona error: {e}")
        return "Unknown"


def _empty_extraction() -> dict:
    return {
        "name": None, "employer": None, "employment_type": None,
        "applicant_category": None, "loan_type": None,
        "years_experience": None, "monthly_income": None,
        "loan_purpose": None, "loan_amount_requested": None,
        "tenure_requested_months": None, "declared_city": None,
        "verbal_consent": False,
        "professional_registration_number": None, "professional_body": None,
        "is_student": False, "course_name": None, "institution_name": None,
        "study_destination": None, "guardian_name": None, "guardian_income": None,
        "property_ownership": None, "property_type": None, "property_estimated_value": None,
        "gold_weight_grams": None, "gold_purity_carats": None,
        "vehicle_make_model": None, "vehicle_estimated_value": None,
        "business_vintage_years": None, "has_guarantor": None,
        "confidence_notes": "Extraction failed or transcript too short"
    }


def _validate_extraction(data: dict) -> dict:
    defaults = _empty_extraction()
    for key in defaults:
        if key not in data:
            data[key] = defaults[key]

    if data.get("monthly_income") and data["monthly_income"] > 10_000_000:
        data["monthly_income"] = None
    if data.get("loan_amount_requested") and data["loan_amount_requested"] > 100_000_000:
        data["loan_amount_requested"] = None
    if data.get("tenure_requested_months") and data["tenure_requested_months"] > 360:
        data["tenure_requested_months"] = 60

    # Normalise loan_type and applicant_category to valid values
    valid_loan_types = {
        "personal","instant_personal","business","professional","home",
        "education_domestic","education_international","lap",
        "gold","pre_owned_car","medical_equipment","consumer_durable","commercial_vehicle"
    }
    valid_categories = {"salaried","self_employed","professional","student","entrepreneur","nri"}

    if data.get("loan_type") not in valid_loan_types:
        data["loan_type"] = None
    if data.get("applicant_category") not in valid_categories:
        data["applicant_category"] = None

    return data