from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import secrets


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="BitNex Technologies API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


# ============================  MODELS  ============================

class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class IntakeInput(BaseModel):
    service: str
    summary: str = Field(min_length=10, max_length=2000)
    timeline: str
    budget: str
    name: str
    email: EmailStr
    company: str = ""
    phone: str = ""


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: str = Field(min_length=2, max_length=80)
    next: str = ""
    due: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    next: Optional[str] = None
    due: Optional[str] = None


class TaskCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    project_id: str


class TaskUpdate(BaseModel):
    label: Optional[str] = None
    done: Optional[bool] = None


class InvoiceCreate(BaseModel):
    label: str = Field(min_length=2, max_length=140)
    amount: float = Field(gt=0)
    project_id: Optional[str] = None


class InvoiceStatusUpdate(BaseModel):
    status: str


class MessageCreate(BaseModel):
    project_id: str
    body: str = Field(min_length=1, max_length=2000)


# ============================  HELPERS  ============================

def public_user(user):
    return {
        "id": str(user.get("_id", user.get("id"))),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }


def token_for(user_id, email, role="admin", kind="access"):
    minutes = 60 * 24 if kind == "access" else 60 * 24 * 7
    return jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": kind,
            "exp": datetime.now(timezone.utc).timestamp() + minutes * 60,
        },
        os.environ["JWT_SECRET"],
        algorithm=JWT_ALGORITHM,
    )


async def current_user(request: Request):
    # 1) Emergent-managed Google session (session_token cookie OR Authorization: Bearer)
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer ") and not auth[7:].count(".") == 2:
            session_token = auth[7:]
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"_id": ObjectId(session["user_id"])})
                if user:
                    return public_user(user)

    # 2) Legacy JWT access_token cookie / bearer
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return public_user(user)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(401, "Invalid or expired session")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def rel_time(iso_str: str) -> str:
    try:
        t = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except Exception:
        return "recently"
    diff = datetime.now(timezone.utc) - t
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    if seconds < 86400 * 2:
        return "Yesterday"
    if seconds < 86400 * 7:
        return f"{seconds // 86400}d ago"
    return t.strftime("%b %d")


def project_doc_to_public(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "type": doc["type"],
        "status": doc.get("status", "Planning"),
        "progress": int(doc.get("progress", 0)),
        "next": doc.get("next", ""),
        "due": doc.get("due", ""),
        "created_at": doc.get("created_at", ""),
    }


def task_doc_to_public(doc, project_name_map=None):
    return {
        "id": str(doc["_id"]),
        "label": doc["label"],
        "done": bool(doc.get("done", False)),
        "project_id": str(doc["project_id"]),
        "project": (project_name_map or {}).get(str(doc["project_id"]), ""),
        "created_at": doc.get("created_at", ""),
    }


def invoice_doc_to_public(doc, project_name_map=None):
    return {
        "id": str(doc["_id"]),
        "label": doc["label"],
        "amount": float(doc.get("amount", 0)),
        "amount_display": f"${doc.get('amount', 0):,.0f}",
        "status": doc.get("status", "Draft"),
        "project_id": str(doc.get("project_id")) if doc.get("project_id") else None,
        "project": (project_name_map or {}).get(str(doc.get("project_id")), ""),
        "created_at": doc.get("created_at", ""),
    }


def message_doc_to_public(doc):
    return {
        "id": str(doc["_id"]),
        "author": doc.get("author", "You"),
        "body": doc["body"],
        "project_id": str(doc["project_id"]),
        "created_at": doc.get("created_at", ""),
        "time": rel_time(doc.get("created_at", "")),
    }


async def log_activity(owner_id: str, label: str, project_name: str = "", kind: str = "info"):
    await db.activity.insert_one({
        "owner_id": owner_id,
        "label": label,
        "project": project_name,
        "kind": kind,
        "created_at": now_iso(),
    })


# ============================  SEEDING  ============================

async def seed_admin_and_data():
    email = os.environ["ADMIN_EMAIL"].lower()
    existing = await db.users.find_one({"email": email})
    if not existing:
        result = await db.users.insert_one({
            "name": "BitNex Admin",
            "email": email,
            "password_hash": bcrypt.hashpw(os.environ["ADMIN_PASSWORD"].encode(), bcrypt.gensalt()).decode(),
            "role": "admin",
            "created_at": now_iso(),
        })
        admin_id = str(result.inserted_id)
    else:
        admin_id = str(existing["_id"])

    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.intakes.create_index("created_at")
    await db.projects.create_index([("owner_id", 1), ("created_at", -1)])
    await db.tasks.create_index([("owner_id", 1), ("created_at", -1)])
    await db.invoices.create_index([("owner_id", 1), ("created_at", -1)])
    await db.activity.create_index([("owner_id", 1), ("created_at", -1)])
    await db.messages.create_index([("project_id", 1), ("created_at", 1)])

    # Seed sample workspace data only if this admin has no projects yet
    if await db.projects.count_documents({"owner_id": admin_id}) == 0:
        p1 = await db.projects.insert_one({
            "owner_id": admin_id,
            "name": "Logistics Operations Platform",
            "type": "Concept delivery workspace",
            "status": "In progress",
            "progress": 62,
            "next": "API integration review",
            "due": "Apr 18, 2026",
            "created_at": now_iso(),
        })
        p2 = await db.projects.insert_one({
            "owner_id": admin_id,
            "name": "Commerce Experience",
            "type": "Discovery & systems design",
            "status": "Planning",
            "progress": 24,
            "next": "Share requirements",
            "due": "May 02, 2026",
            "created_at": now_iso(),
        })
        await db.tasks.insert_many([
            {"owner_id": admin_id, "project_id": str(p1.inserted_id), "label": "Approve experience map", "done": False, "created_at": now_iso()},
            {"owner_id": admin_id, "project_id": str(p2.inserted_id), "label": "Share integration list", "done": False, "created_at": now_iso()},
            {"owner_id": admin_id, "project_id": str(p1.inserted_id), "label": "Review project scope", "done": True, "created_at": now_iso()},
        ])
        await db.invoices.insert_many([
            {"owner_id": admin_id, "project_id": str(p1.inserted_id), "label": "Discovery & architecture", "amount": 2400, "status": "Draft", "created_at": now_iso()},
            {"owner_id": admin_id, "project_id": str(p1.inserted_id), "label": "Platform engineering", "amount": 8800, "status": "Pending review", "created_at": now_iso()},
        ])
        await db.activity.insert_many([
            {"owner_id": admin_id, "label": "Milestone review scheduled", "project": "Logistics Operations Platform", "kind": "milestone", "created_at": now_iso()},
            {"owner_id": admin_id, "label": "New project brief received", "project": "Commerce Experience", "kind": "brief", "created_at": now_iso()},
        ])


@app.on_event("startup")
async def startup():
    await seed_admin_and_data()


# ============================  AUTH ROUTES  ============================

@api_router.get("/")
async def root():
    return {"message": "BitNex Technologies API"}


@api_router.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    result = await db.users.insert_one({
        "name": payload.name,
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        "role": "client",
        "created_at": now_iso(),
    })
    user = {"id": str(result.inserted_id), "name": payload.name, "email": email, "role": "client"}
    response.set_cookie("access_token", token_for(result.inserted_id, email, "client"), httponly=True, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", token_for(result.inserted_id, email, "client", "refresh"), httponly=True, samesite="lax", max_age=604800)
    return user


@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Email or password is incorrect")
    response.set_cookie("access_token", token_for(user["_id"], user["email"], user.get("role", "client")), httponly=True, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", token_for(user["_id"], user["email"], user.get("role", "client"), "refresh"), httponly=True, samesite="lax", max_age=604800)
    return public_user(user)


@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


@api_router.post("/auth/session")
async def emergent_session(request: Request, response: Response):
    """Exchange an Emergent OAuth session_id for a persistent session_token.

    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(400, "Missing X-Session-ID header")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
            )
    except httpx.HTTPError:
        raise HTTPException(502, "Auth provider unreachable")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired Google session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email or not data.get("session_token"):
        raise HTTPException(400, "Malformed session data")

    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["_id"]
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"), "picture": data.get("picture", "")}},
        )
        user = await db.users.find_one({"_id": user_id})
    else:
        result = await db.users.insert_one({
            "name": data.get("name") or email.split("@")[0],
            "email": email,
            "password_hash": "",
            "role": "client",
            "auth_provider": "emergent-google",
            "picture": data.get("picture", ""),
            "created_at": now_iso(),
        })
        user_id = result.inserted_id
        user = await db.users.find_one({"_id": user_id})

    await db.user_sessions.insert_one({
        "user_id": str(user_id),
        "session_token": data["session_token"],
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        "session_token",
        data["session_token"],
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============================  PORTAL: PROJECTS  ============================

async def get_project_name_map(owner_id: str):
    projects = await db.projects.find({"owner_id": owner_id}).to_list(500)
    return {str(p["_id"]): p["name"] for p in projects}


@api_router.get("/portal/projects")
async def list_projects(user=Depends(current_user)):
    docs = await db.projects.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [project_doc_to_public(d) for d in docs]


@api_router.post("/portal/projects")
async def create_project(payload: ProjectCreate, user=Depends(current_user)):
    doc = {
        "owner_id": user["id"],
        "name": payload.name,
        "type": payload.type,
        "status": "Planning",
        "progress": 0,
        "next": payload.next or "Kickoff",
        "due": payload.due or "",
        "created_at": now_iso(),
    }
    result = await db.projects.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_activity(user["id"], f"Project created: {payload.name}", payload.name, "project_created")
    return project_doc_to_public(doc)


@api_router.patch("/portal/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate, user=Depends(current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.projects.find_one_and_update(
        {"_id": ObjectId(project_id), "owner_id": user["id"]},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Project not found")
    if "progress" in updates and updates["progress"] == 100:
        await log_activity(user["id"], f"Project completed: {result['name']}", result["name"], "project_completed")
    return project_doc_to_public(result)


@api_router.delete("/portal/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(current_user)):
    result = await db.projects.find_one_and_delete({"_id": ObjectId(project_id), "owner_id": user["id"]})
    if not result:
        raise HTTPException(404, "Project not found")
    await db.tasks.delete_many({"project_id": project_id, "owner_id": user["id"]})
    await log_activity(user["id"], f"Project removed: {result['name']}", result["name"], "project_deleted")
    return {"ok": True}


# ============================  PORTAL: TASKS  ============================

@api_router.get("/portal/tasks")
async def list_tasks(user=Depends(current_user)):
    docs = await db.tasks.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    name_map = await get_project_name_map(user["id"])
    return [task_doc_to_public(d, name_map) for d in docs]


@api_router.post("/portal/tasks")
async def create_task(payload: TaskCreate, user=Depends(current_user)):
    project = await db.projects.find_one({"_id": ObjectId(payload.project_id), "owner_id": user["id"]})
    if not project:
        raise HTTPException(404, "Project not found")
    doc = {
        "owner_id": user["id"],
        "project_id": payload.project_id,
        "label": payload.label,
        "done": False,
        "created_at": now_iso(),
    }
    result = await db.tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_activity(user["id"], f"Task added: {payload.label}", project["name"], "task_added")
    return task_doc_to_public(doc, {payload.project_id: project["name"]})


@api_router.patch("/portal/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.tasks.find_one_and_update(
        {"_id": ObjectId(task_id), "owner_id": user["id"]},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Task not found")
    if updates.get("done") is True:
        project = await db.projects.find_one({"_id": ObjectId(result["project_id"])})
        await log_activity(user["id"], f"Task completed: {result['label']}", (project or {}).get("name", ""), "task_completed")
    name_map = await get_project_name_map(user["id"])
    return task_doc_to_public(result, name_map)


@api_router.delete("/portal/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(current_user)):
    result = await db.tasks.find_one_and_delete({"_id": ObjectId(task_id), "owner_id": user["id"]})
    if not result:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


# ============================  PORTAL: INVOICES  ============================

@api_router.get("/portal/invoices")
async def list_invoices(user=Depends(current_user)):
    docs = await db.invoices.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    name_map = await get_project_name_map(user["id"])
    return [invoice_doc_to_public(d, name_map) for d in docs]


@api_router.post("/portal/invoices")
async def create_invoice(payload: InvoiceCreate, user=Depends(current_user)):
    doc = {
        "owner_id": user["id"],
        "project_id": payload.project_id,
        "label": payload.label,
        "amount": payload.amount,
        "status": "Draft",
        "created_at": now_iso(),
    }
    result = await db.invoices.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_activity(user["id"], f"Invoice drafted: {payload.label}", "", "invoice_created")
    name_map = await get_project_name_map(user["id"])
    return invoice_doc_to_public(doc, name_map)


@api_router.patch("/portal/invoices/{invoice_id}")
async def update_invoice_status(invoice_id: str, payload: InvoiceStatusUpdate, user=Depends(current_user)):
    result = await db.invoices.find_one_and_update(
        {"_id": ObjectId(invoice_id), "owner_id": user["id"]},
        {"$set": {"status": payload.status}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Invoice not found")
    await log_activity(user["id"], f"Invoice {payload.status.lower()}: {result['label']}", "", "invoice_status")
    name_map = await get_project_name_map(user["id"])
    return invoice_doc_to_public(result, name_map)


# ============================  PORTAL: MESSAGES  ============================

@api_router.get("/portal/messages")
async def list_messages(project_id: str, user=Depends(current_user)):
    docs = await db.messages.find({"project_id": project_id}).sort("created_at", 1).to_list(500)
    return [message_doc_to_public(d) for d in docs]


@api_router.post("/portal/messages")
async def create_message(payload: MessageCreate, user=Depends(current_user)):
    project = await db.projects.find_one({"_id": ObjectId(payload.project_id), "owner_id": user["id"]})
    if not project:
        raise HTTPException(404, "Project not found")
    doc = {
        "owner_id": user["id"],
        "project_id": payload.project_id,
        "author": user["name"],
        "body": payload.body,
        "created_at": now_iso(),
    }
    result = await db.messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_activity(user["id"], f"Message posted in {project['name']}", project["name"], "message")
    return message_doc_to_public(doc)


# ============================  PORTAL: ACTIVITY & OVERVIEW  ============================

@api_router.get("/portal/activity")
async def list_activity(user=Depends(current_user)):
    docs = await db.activity.find({"owner_id": user["id"]}).sort("created_at", -1).limit(30).to_list(30)
    return [{
        "id": str(d["_id"]),
        "label": d["label"],
        "project": d.get("project", ""),
        "kind": d.get("kind", "info"),
        "time": rel_time(d.get("created_at", "")),
    } for d in docs]


@api_router.get("/portal/overview")
async def portal_overview(user=Depends(current_user)):
    project_docs = await db.projects.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    name_map = {str(p["_id"]): p["name"] for p in project_docs}
    task_docs = await db.tasks.find({"owner_id": user["id"]}).sort("created_at", -1).limit(6).to_list(6)
    invoice_docs = await db.invoices.find({"owner_id": user["id"]}).sort("created_at", -1).limit(6).to_list(6)
    outstanding_agg = await db.invoices.aggregate([
        {"$match": {"owner_id": user["id"], "status": {"$ne": "Paid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    outstanding_total = float(outstanding_agg[0]["total"]) if outstanding_agg else 0.0
    activity_docs = await db.activity.find({"owner_id": user["id"]}).sort("created_at", -1).limit(6).to_list(6)
    return {
        "user": user,
        "projects": [project_doc_to_public(d) for d in project_docs],
        "tasks": [task_doc_to_public(d, name_map) for d in task_docs],
        "invoices": [invoice_doc_to_public(d, name_map) for d in invoice_docs],
        "activity": [{
            "id": str(d["_id"]),
            "label": d["label"],
            "project": d.get("project", ""),
            "kind": d.get("kind", "info"),
            "time": rel_time(d.get("created_at", "")),
        } for d in activity_docs],
        "stats": {
            "projects": len(project_docs),
            "in_progress": sum(1 for p in project_docs if p.get("status") == "In progress"),
            "open_tasks": await db.tasks.count_documents({"owner_id": user["id"], "done": False}),
            "outstanding": outstanding_total,
        },
    }


# ============================  INTAKE (marketing form)  ============================

@api_router.post("/intake")
async def create_intake(payload: IntakeInput):
    await db.intakes.insert_one({**payload.model_dump(), "created_at": now_iso(), "status": "new"})
    return {"ok": True, "message": "Thanks — the BitNex team will review your brief and reply shortly."}


# ============================  MOUNT  ============================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
