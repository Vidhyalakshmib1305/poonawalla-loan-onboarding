"""
Database setup — SQLite via raw sqlite3.
All data stored in India (local server) per RBI Digital Lending Directions 2025.

Changes:
- Added: email, loan_type, applicant_category, employee_id_data,
         student_id_data, co_applicant_data columns
- Added: migrate_db() for safe ALTER TABLE on existing databases
- init_db() now calls migrate_db() after CREATE TABLE so both fresh
  installs and existing databases get all columns
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

import os as _os
# In Docker production, DATABASE_PATH env var points to persistent volume
_env_db = _os.getenv("DATABASE_PATH", "")
DB_PATH = Path(_env_db) if _env_db else Path(__file__).parent.parent / "audit.db"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Sessions table — one row per loan application
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id                  TEXT PRIMARY KEY,
            mobile              TEXT NOT NULL,
            email               TEXT DEFAULT '',
            created_at          TEXT NOT NULL,
            status              TEXT DEFAULT 'initiated',
            otp_verified        INTEGER DEFAULT 0,
            kyc_verified        INTEGER DEFAULT 0,
            liveness_passed     INTEGER DEFAULT 0,
            face_match_score    REAL DEFAULT 0,
            age_estimated       INTEGER DEFAULT 0,
            age_from_doc        INTEGER DEFAULT 0,
            age_flag            INTEGER DEFAULT 0,
            loan_type           TEXT DEFAULT 'personal',
            applicant_category  TEXT DEFAULT 'salaried',
            transcript          TEXT DEFAULT '',
            extracted_data      TEXT DEFAULT '{}',
            employee_id_data    TEXT DEFAULT '{}',
            student_id_data     TEXT DEFAULT '{}',
            co_applicant_data   TEXT DEFAULT '{}',
            bureau_data         TEXT DEFAULT '{}',
            risk_result         TEXT DEFAULT '{}',
            offer               TEXT DEFAULT '{}',
            consent_captured    INTEGER DEFAULT 0,
            final_decision      TEXT DEFAULT 'pending',
            rejection_reason    TEXT DEFAULT '',
            ip_address          TEXT DEFAULT '',
            gps_lat             REAL DEFAULT 0,
            gps_lng             REAL DEFAULT 0,
            declared_city       TEXT DEFAULT '',
            updated_at          TEXT NOT NULL
        )
    """)

    # Audit log — every event in the session lifecycle
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            event       TEXT NOT NULL,
            payload     TEXT DEFAULT '{}',
            timestamp   TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)

    # Referral program — one row per referral link issued to a verified customer
    cur.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id              TEXT PRIMARY KEY,
            referrer_email  TEXT NOT NULL,
            referral_token  TEXT UNIQUE NOT NULL,
            referred_email  TEXT DEFAULT '',
            status          TEXT DEFAULT 'pending',
            coins_earned    INTEGER DEFAULT 0,
            created_at      TEXT NOT NULL,
            rewarded_at     TEXT DEFAULT ''
        )
    """)

    # Email OTPs for Refer & Earn verification (hashed, short-lived)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS email_otps (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT NOT NULL,
            otp_hash    TEXT NOT NULL,
            expires_at  TEXT NOT NULL,
            used        INTEGER DEFAULT 0
        )
    """)

    # KFS records — mandatory RBI Key Facts Statement
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kfs_records (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id            TEXT NOT NULL,
            loan_type             TEXT DEFAULT 'personal',
            loan_amount           REAL,
            interest_rate         REAL,
            tenure_months         INTEGER,
            emi                   REAL,
            processing_fee        REAL,
            apr                   REAL,
            total_repayment       REAL,
            prepayment_penalty    TEXT DEFAULT 'NIL for floating rate (RBI mandate)',
            generated_at          TEXT NOT NULL,
            accepted_by_borrower  INTEGER DEFAULT 0,
            accepted_at           TEXT DEFAULT ''
        )
    """)

    conn.commit()
    conn.close()

    # Run migration to add any missing columns to existing databases
    migrate_db()
    print(f"[DB] Database ready at {DB_PATH}")


def migrate_db():
    """
    Safely add new columns to an existing database.
    SQLite does not support IF NOT EXISTS for ALTER TABLE,
    so we catch the OperationalError when a column already exists.
    """
    new_session_columns = [
        ("email",              "TEXT DEFAULT ''"),
        ("loan_type",          "TEXT DEFAULT 'personal'"),
        ("applicant_category", "TEXT DEFAULT 'salaried'"),
        ("employee_id_data",   "TEXT DEFAULT '{}'"),
        ("student_id_data",    "TEXT DEFAULT '{}'"),
        ("co_applicant_data",  "TEXT DEFAULT '{}'"),
        ("dob_year",           "INTEGER DEFAULT 1990"),
        ("dob_month",          "INTEGER DEFAULT 1"),
        ("dob_day",            "INTEGER DEFAULT 1"),
    ]
    new_kfs_columns = [
        ("loan_type", "TEXT DEFAULT 'personal'"),
    ]

    conn = get_connection()
    for col, defn in new_session_columns:
        try:
            conn.execute(f"ALTER TABLE sessions ADD COLUMN {col} {defn}")
            print(f"[DB] Migration: added sessions.{col}")
        except Exception:
            pass  # Already exists
    for col, defn in new_kfs_columns:
        try:
            conn.execute(f"ALTER TABLE kfs_records ADD COLUMN {col} {defn}")
            print(f"[DB] Migration: added kfs_records.{col}")
        except Exception:
            pass
    conn.commit()
    conn.close()


def log_event(session_id: str, event: str, payload: dict = {}):
    """Append an immutable audit event — required for RBI compliance."""
    conn = get_connection()
    conn.execute(
        "INSERT INTO audit_log (session_id, event, payload, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, event, json.dumps(payload), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()


def update_session(session_id: str, fields: dict):
    """Update session fields and always refresh updated_at."""
    fields["updated_at"] = datetime.utcnow().isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [session_id]
    conn = get_connection()
    conn.execute(f"UPDATE sessions SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_session(session_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_audit_trail(session_id: str):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM audit_log WHERE session_id = ? ORDER BY timestamp ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def is_registered_customer(email: str) -> bool:
    """Return True if the email belongs to an existing session (i.e. a known customer)."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM sessions WHERE email = ? LIMIT 1", (email.lower().strip(),)
    ).fetchone()
    conn.close()
    return row is not None


def get_referral_by_token(token: str):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM referrals WHERE referral_token = ?", (token,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_referral_by_email(email: str):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM referrals WHERE referrer_email = ?", (email.lower().strip(),)
    ).fetchone()
    conn.close()
    return dict(row) if row else None
