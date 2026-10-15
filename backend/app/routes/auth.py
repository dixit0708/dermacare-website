from fastapi import APIRouter, HTTPException
import bcrypt
import hmac
import jwt
from datetime import datetime, timezone, timedelta
import uuid

from app.database import db
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, SIGNUP_CODE
from app.models import UserRegister, UserLogin

router = APIRouter()

@router.post("/auth/register")
async def register(payload: UserRegister):
    if not SIGNUP_CODE:
        raise HTTPException(status_code=403, detail={"msg": "Sign-up is closed. Ask the clinic admin to create your account."})
    # compare_digest avoids leaking how many characters matched through response timing
    if not hmac.compare_digest(payload.signup_code, SIGNUP_CODE):
        raise HTTPException(status_code=403, detail={"msg": "Invalid clinic signup code"})

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
        # Never taken from the request; an Admin is promoted directly in the database.
        "role": "Doctor",
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
