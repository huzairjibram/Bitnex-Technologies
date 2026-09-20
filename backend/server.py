from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import secrets


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="BitNex Technologies API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

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

JWT_ALGORITHM = "HS256"

def public_user(user):
    return {"id": str(user.get("_id", user.get("id"))), "name": user["name"], "email": user["email"], "role": user["role"]}

def token_for(user_id, email, kind="access"):
    minutes = 15 if kind == "access" else 60 * 24 * 7
    return jwt.encode({"sub": str(user_id), "email": email, "role": "admin", "type": kind, "exp": datetime.now(timezone.utc).timestamp() + minutes * 60}, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

async def current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return public_user(user)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(401, "Invalid or expired session")

async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"name": "BitNex Admin", "email": email, "password_hash": bcrypt.hashpw(os.environ["ADMIN_PASSWORD"].encode(), bcrypt.gensalt()).decode(), "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    await db.users.create_index("email", unique=True)
    await db.intakes.create_index("created_at")

@app.on_event("startup")
async def startup():
    await seed_admin()

@api_router.get("/")
async def root():
    return {"message": "BitNex Technologies API"}

@api_router.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    result = await db.users.insert_one({"name": payload.name, "email": email, "password_hash": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(), "role": "client", "created_at": datetime.now(timezone.utc).isoformat()})
    user = {"id": str(result.inserted_id), "name": payload.name, "email": email, "role": "client"}
    response.set_cookie("access_token", token_for(result.inserted_id, email), httponly=True, samesite="lax", max_age=900)
    response.set_cookie("refresh_token", token_for(result.inserted_id, email, "refresh"), httponly=True, samesite="lax", max_age=604800)
    return user

@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Email or password is incorrect")
    response.set_cookie("access_token", token_for(user["_id"], user["email"]), httponly=True, samesite="lax", max_age=900)
    response.set_cookie("refresh_token", token_for(user["_id"], user["email"], "refresh"), httponly=True, samesite="lax", max_age=604800)
    return public_user(user)

@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"ok": True}

@api_router.get("/portal/overview")
async def portal_overview(user=Depends(current_user)):
    projects = [{"id": "proj-001", "name": "Logistics Operations Platform", "type": "Concept delivery workspace", "status": "In progress", "progress": 62, "next": "API integration review", "due": "Apr 18, 2026"}, {"id": "proj-002", "name": "Commerce Experience", "type": "Discovery & systems design", "status": "Planning", "progress": 24, "next": "Share requirements", "due": "May 02, 2026"}]
    return {"user": user, "projects": projects, "activity": [{"label": "Milestone review scheduled", "time": "Today", "project": "Logistics Operations Platform"}, {"label": "New project brief received", "time": "Yesterday", "project": "Commerce Experience"}], "tasks": [{"label": "Approve experience map", "project": "Logistics Operations Platform", "done": False}, {"label": "Share integration list", "project": "Commerce Experience", "done": False}, {"label": "Review project scope", "project": "Logistics Operations Platform", "done": True}], "invoices": [{"label": "Discovery & architecture", "amount": "$2,400", "status": "Draft"}, {"label": "Platform engineering", "amount": "$8,800", "status": "Pending review"}]}

@api_router.post("/intake")
async def create_intake(payload: IntakeInput):
    await db.intakes.insert_one({**payload.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "status": "new"})
    return {"ok": True, "message": "Thanks — the BitNex team will review your brief and reply shortly."}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()