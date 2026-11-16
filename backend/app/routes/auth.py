from fastapi import APIRouter, HTTPException
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import uuid

from app.database import db
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from app.models import BCRYPT_MAX_BYTES, UserRegister, UserLogin

router = APIRouter()

# Hash of a random value nobody knows, same cost factor as real password hashes.
_DUMMY_HASH = bcrypt.hashpw(uuid.uuid4().bytes, bcrypt.gensalt()).decode()

@router.post("/auth/register")
async def register(payload: UserRegister):
    # Open sign-up: anyone who reaches the admin page can create a Doctor account.
    # The role is always Doctor; only an Admin can delete patients.
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
    invalid = HTTPException(status_code=401, detail={"msg": "Invalid username or password"})
    password = payload.password.encode()
    # No account can have a longer password (registration rejects it), and
    # bcrypt 5 raises instead of returning False, so reject it here.
    if len(password) > BCRYPT_MAX_BYTES:
        raise invalid

    user = await db.users.find_one({"username": payload.username})
    # Unknown usernames are checked against a dummy hash, so the response takes the
    # same time either way and can't be used to discover which usernames exist.
    stored_hash = user.get("password_hash") if user else None
    password_ok = bcrypt.checkpw(password, (stored_hash or _DUMMY_HASH).encode())
    if not stored_hash or not password_ok:
        raise invalid

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
