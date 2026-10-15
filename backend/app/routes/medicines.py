from fastapi import APIRouter, HTTPException, Header, Request, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import bcrypt
from bson import ObjectId

from app.database import db, dpms_db
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, ADMIN_TOKEN
from app.models import *
from app.services.email import send_email_raw
from app.services.sms import send_sms_raw



router = APIRouter()

def _fmt_date(dt_str: str) -> str:
    if not dt_str or dt_str == "Pending":
        return "To be confirmed"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return dt_str

def _verify_jwt(token: str):
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token_str = token.split(" ")[1]
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/medicines")
async def get_medicines(authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    meds = []
    async for m in dpms_db.medicines.find():
        m["_id"] = str(m["_id"])
        meds.append(m)
    return {"medicines": meds}

@router.post("/medicines")
async def create_medicine(payload: MedicineCreate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    data = payload.model_dump()
    res = await dpms_db.medicines.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return data

@router.put("/medicines/{mid}")
async def update_medicine(mid: str, payload: MedicineUpdate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(mid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    data = payload.model_dump(exclude_unset=True)
    if data:
        await dpms_db.medicines.update_one({"_id": oid}, {"$set": data})
    return {"ok": True}

@router.delete("/medicines/{mid}")
async def delete_medicine(mid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(mid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    res = await dpms_db.medicines.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"ok": True}

# Admin appointment routes
