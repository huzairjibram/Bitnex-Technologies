"""Portal CRUD + Auth backend tests for BitNex."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@bitnextechnologies.com')
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    return s


@pytest.fixture(scope="module")
def created_ids():
    return {"projects": [], "tasks": [], "invoices": []}


# --- Auth ---
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200

def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401

def test_me(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL

def test_unauth_portal():
    r = requests.get(f"{API}/portal/overview")
    assert r.status_code == 401


# --- Overview & seed ---
def test_overview_has_data(session):
    r = session.get(f"{API}/portal/overview")
    assert r.status_code == 200
    data = r.json()
    assert "projects" in data and "stats" in data
    assert data["stats"]["projects"] >= 2, f"Expected seeded projects, got {data['stats']}"
    assert data["stats"]["open_tasks"] >= 1
    # invoices in overview are limited to 6
    assert isinstance(data["invoices"], list)


# --- Projects CRUD ---
def test_list_projects(session):
    r = session.get(f"{API}/portal/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_project(session, created_ids):
    r = session.post(f"{API}/portal/projects", json={"name": "TEST_Project_Alpha", "type": "Testing"})
    assert r.status_code == 200
    p = r.json()
    assert p["name"] == "TEST_Project_Alpha"
    assert p["status"] == "Planning"
    assert "id" in p
    created_ids["projects"].append(p["id"])
    # verify GET
    r2 = session.get(f"{API}/portal/projects")
    assert any(x["id"] == p["id"] for x in r2.json())

def test_update_project(session, created_ids):
    pid = created_ids["projects"][0]
    r = session.patch(f"{API}/portal/projects/{pid}", json={"progress": 50, "status": "In progress"})
    assert r.status_code == 200
    assert r.json()["progress"] == 50
    assert r.json()["status"] == "In progress"


# --- Tasks CRUD ---
def test_create_task(session, created_ids):
    pid = created_ids["projects"][0]
    r = session.post(f"{API}/portal/tasks", json={"label": "TEST_Task_1", "project_id": pid})
    assert r.status_code == 200
    t = r.json()
    assert t["label"] == "TEST_Task_1"
    assert t["done"] == False
    created_ids["tasks"].append(t["id"])

def test_toggle_task(session, created_ids):
    tid = created_ids["tasks"][0]
    r = session.patch(f"{API}/portal/tasks/{tid}", json={"done": True})
    assert r.status_code == 200
    assert r.json()["done"] == True
    # verify persistence
    r2 = session.get(f"{API}/portal/tasks")
    task = next(x for x in r2.json() if x["id"] == tid)
    assert task["done"] == True


# --- Invoices CRUD ---
def test_create_invoice(session, created_ids):
    pid = created_ids["projects"][0]
    r = session.post(f"{API}/portal/invoices", json={"label": "TEST_Retainer", "amount": 5000, "project_id": pid})
    assert r.status_code == 200
    inv = r.json()
    assert inv["amount"] == 5000
    assert inv["status"] == "Draft"
    assert inv["amount_display"] == "$5,000"
    created_ids["invoices"].append(inv["id"])

def test_mark_invoice_paid(session, created_ids):
    iid = created_ids["invoices"][0]
    r = session.patch(f"{API}/portal/invoices/{iid}", json={"status": "Paid"})
    assert r.status_code == 200
    assert r.json()["status"] == "Paid"


# --- Activity feed ---
def test_activity_reflects_actions(session):
    r = session.get(f"{API}/portal/activity")
    assert r.status_code == 200
    labels = [a["label"] for a in r.json()]
    assert any("TEST_Project_Alpha" in l for l in labels), f"activity labels: {labels}"
    assert any("TEST_Task_1" in l for l in labels)
    assert any("TEST_Retainer" in l for l in labels)


# --- Cleanup: Delete task & project (cascade) ---
def test_delete_task(session, created_ids):
    tid = created_ids["tasks"][0]
    r = session.delete(f"{API}/portal/tasks/{tid}")
    assert r.status_code == 200

def test_delete_project_cascade(session, created_ids):
    pid = created_ids["projects"][0]
    # add a task first to verify cascade
    t = session.post(f"{API}/portal/tasks", json={"label": "TEST_cascade", "project_id": pid}).json()
    r = session.delete(f"{API}/portal/projects/{pid}")
    assert r.status_code == 200
    # verify project gone
    tasks = session.get(f"{API}/portal/tasks").json()
    assert not any(x["id"] == t["id"] for x in tasks), "child tasks should be cascade-deleted"


def test_logout(session):
    r = session.post(f"{API}/auth/logout")
    assert r.status_code == 200
