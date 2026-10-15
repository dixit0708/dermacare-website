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

@router.get("/patients")
async def get_patients(
    patient_type: Optional[str] = None,
    name: Optional[str] = None,
    whatsapp: Optional[str] = None,
    patient_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    _verify_jwt(authorization)
    
    query = {}
    if patient_type:
        query["patient_type"] = patient_type
    if name:
        query["full_name"] = {"$regex": name, "$options": "i"}
    if whatsapp:
        query["whatsapp"] = {"$regex": whatsapp}
    if patient_id:
        query["patient_id"] = {"$regex": patient_id, "$options": "i"}

    patients = []
    async for p in dpms_db.patients.find(query).sort("created_at", -1).limit(100):
        p["_id"] = str(p["_id"])
        patients.append(p)
    return {"items": patients}

@router.post("/patients")
async def create_patient(payload: PatientCreate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    data = payload.model_dump(exclude_unset=True)
    if data.get("whatsapp"):
        existing = await dpms_db.patients.find_one({"whatsapp": data["whatsapp"]})
        if existing:
            raise HTTPException(status_code=409, detail={"duplicate": True, "msg": "Patient already exists", "patient_id": existing.get("patient_id", str(existing["_id"]))})
    
    import random
    import string
    # Generate simple patient ID e.g. PT-12345
    pid = "PT-" + "".join(random.choices(string.digits, k=5))
    data["patient_id"] = pid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    if "visits" not in data:
        data["visits"] = []
    
    await dpms_db.patients.insert_one(data)
    if "_id" in data:
        data["_id"] = str(data["_id"])
    return data

@router.get("/patients/{pid}")
async def get_patient(pid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    doc = await dpms_db.patients.find_one({"patient_id": pid})
    if not doc:
        # Fallback to _id string
        from bson import ObjectId
        try:
            doc = await dpms_db.patients.find_one({"_id": ObjectId(pid)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc["_id"] = str(doc["_id"])
    return doc

@router.put("/patients/{pid}")
async def update_patient(pid: str, request: Request, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    try:
        from bson import ObjectId
        obj_id = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
        
    payload = await request.json()
    visit = payload.pop("visit", None)
    
    # Optional: validate the base patient fields using PatientUpdate
    try:
        validated_data = PatientUpdate(**payload).model_dump(exclude_unset=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
        
    update_data = {}
    if validated_data:
        update_data["$set"] = validated_data
        
    if visit:
        import uuid
        visit["visit_id"] = str(uuid.uuid4())
        visit["created_at"] = datetime.now(timezone.utc).isoformat()
        if "next_visit" not in visit:
            visit["next_visit"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            if "$set" not in update_data:
                update_data["$set"] = {}
            update_data["$set"]["next_visit"] = visit["next_visit"]
            
        update_data["$push"] = {"visits": visit}
        
    if not update_data:
        return {"msg": "Nothing to update"}
    
    doc = await dpms_db.patients.find_one_and_update(
        {"_id": obj_id},
        update_data,
        return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc["_id"] = str(doc["_id"])
    return doc

@router.delete("/patients/{pid}")
async def delete_patient(pid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
    result = await dpms_db.patients.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}

@router.patch("/patients/{pid}/visit-dispatch")
async def update_visit_dispatch(pid: str, payload: dict, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    visit_id = payload.get("visit_id")
    dispatch_date = payload.get("dispatch_date")
    tracking_id = payload.get("tracking_id")
    
    from bson import ObjectId
    try:
        oid = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
    
    query = {"_id": oid, "visits.visit_id": visit_id}
    update = {"$set": {"visits.$.dispatch_date": dispatch_date, "visits.$.tracking_id": tracking_id}}
    res = await dpms_db.patients.update_one(query, update)
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient/Visit not found")
    return {"ok": True}

# DPMS Medicines
