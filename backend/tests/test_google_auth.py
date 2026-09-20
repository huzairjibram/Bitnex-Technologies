"""Emergent Google Auth session tests.

Covers:
- POST /api/auth/session missing / invalid X-Session-ID
- Session-token based auth on /api/auth/me and /api/portal/overview
  (both via cookie and via Authorization: Bearer non-JWT)
- Expired session rejection
- Logout deletes user_sessions row
- Legacy JWT login still works (regression)
"""
import os
import secrets
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

ADMIN_EMAIL = "admin@bitnextechnologies.com"
ADMIN_PASSWORD = "BitNexPortal2026!"


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="module")
def admin_id(mongo):
    u = mongo.users.find_one({"email": ADMIN_EMAIL})
    assert u, "Admin user missing (seed failed)"
    return str(u["_id"])


@pytest.fixture
def seeded_session(mongo, admin_id):
    token = f"TEST_sess_{secrets.token_hex(8)}"
    mongo.user_sessions.insert_one({
        "user_id": admin_id,
        "session_token": token,
        "email": ADMIN_EMAIL,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    yield token
    mongo.user_sessions.delete_many({"session_token": token})


# ---------- /api/auth/session endpoint validation ----------

def test_session_missing_header():
    r = requests.post(f"{API}/auth/session")
    assert r.status_code == 400
    assert "X-Session-ID" in r.json().get("detail", "")


def test_session_invalid_id():
    r = requests.post(f"{API}/auth/session",
                      headers={"X-Session-ID": "definitely-not-a-real-session-id"})
    assert r.status_code == 401
    assert r.json().get("detail") == "Invalid or expired Google session"


# ---------- Session-token authentication ----------

def test_me_with_session_cookie(seeded_session):
    r = requests.get(f"{API}/auth/me", cookies={"session_token": seeded_session})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"


def test_me_with_bearer_non_jwt(seeded_session):
    # Non-JWT bearer token should be treated as session_token
    r = requests.get(f"{API}/auth/me",
                     headers={"Authorization": f"Bearer {seeded_session}"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == ADMIN_EMAIL


def test_portal_overview_with_session(seeded_session):
    r = requests.get(f"{API}/portal/overview",
                     cookies={"session_token": seeded_session})
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ["user", "projects", "tasks", "invoices", "activity", "stats"]:
        assert key in data, f"Missing key {key} in overview"
    assert data["user"]["email"] == ADMIN_EMAIL


# ---------- Expired session ----------

def test_expired_session_rejected(mongo, admin_id):
    token = f"TEST_expired_{secrets.token_hex(8)}"
    mongo.user_sessions.insert_one({
        "user_id": admin_id,
        "session_token": token,
        "email": ADMIN_EMAIL,
        "expires_at": datetime.now(timezone.utc) - timedelta(days=1),
        "created_at": datetime.now(timezone.utc) - timedelta(days=8),
    })
    try:
        r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
        assert r.status_code == 401
    finally:
        mongo.user_sessions.delete_many({"session_token": token})


# ---------- Logout clears session row ----------

def test_logout_deletes_session_row(mongo, admin_id):
    token = f"TEST_logout_{secrets.token_hex(8)}"
    mongo.user_sessions.insert_one({
        "user_id": admin_id,
        "session_token": token,
        "email": ADMIN_EMAIL,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    # Confirm auth works before logout
    r1 = requests.get(f"{API}/auth/me", cookies={"session_token": token})
    assert r1.status_code == 200

    # Logout
    r2 = requests.post(f"{API}/auth/logout", cookies={"session_token": token})
    assert r2.status_code == 200

    # Session row should be gone
    assert mongo.user_sessions.find_one({"session_token": token}) is None

    # Subsequent auth should 401
    r3 = requests.get(f"{API}/auth/me", cookies={"session_token": token})
    assert r3.status_code == 401


# ---------- Legacy JWT regression ----------

def test_legacy_jwt_login_still_works():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert "access_token" in s.cookies
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN_EMAIL

    ov = s.get(f"{API}/portal/overview")
    assert ov.status_code == 200
    assert "projects" in ov.json()
