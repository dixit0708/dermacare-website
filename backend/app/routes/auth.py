from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import uuid

from app.database import db
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, ADMIN_TOKEN
from app.models import UserRegister, UserLogin

router = APIRouter()

@router.post("/auth/register")
async def register(payload: UserRegister):
    existing = await db.users.find_one({"username": payload.username})
    if existing:
        raise HTTPException(status_code=409, detail={"msg": "Username already taken"})
    
    hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "username": payload.username,
        "password_hash": hashed,
        "full_name": payload.full_name,
        "role": payload.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"ok": True, "msg": "Account created successfully"}

@router.post("/auth/login")
async def login(payload: UserLogin):
    user = await db.users.find_one({"username": payload.username})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail={"msg": "Invalid username or password"})
    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail={"msg": "Invalid username or password"})
    
    token_data = {
        "sub": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    }
    
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "ok": True,
        "access_token": token, "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@router.post("/admin/verify")
async def verify_admin_token(x_admin_token: Optional[str] = Header(default=None)):
    if not x_admin_token or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"ok": True}

