from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Request, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import asyncio
import re
import uuid
import jwt
import bcrypt
from bson import ObjectId

from app.database import db, dpms_db
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, ADMIN_TOKEN
from app.models import *
from app.services.email import send_email_raw
from app.services.sms import send_sms_raw
from app.services.notifications import send_booking_notifications, send_post_visit_notifications



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

@router.post("/appointments", response_model=Appointment)
async def create_appointment(payload: AppointmentCreate, background_tasks: BackgroundTasks):
    appt = Appointment(**payload.model_dump())
    await db.appointments.insert_one(appt.model_dump())

    # Mirror to DPMS DB
    escaped_name    = re.escape(payload.full_name)
    existing_patient = await dpms_db.patients.find_one({
        "whatsapp": payload.phone,
        "full_name": {"$regex": f"^{escaped_name}$", "$options": "i"},
    }) if payload.phone and payload.full_name else None

    if existing_patient:
        patient_id = existing_patient.get("patient_id")
        source     = "Existing Patient Booking"
        new_type   = "online" if payload.consultation_type == "online" else "offline"
        if existing_patient.get("patient_type") != new_type:
            await dpms_db.patients.update_one(
                {"_id": existing_patient["_id"]},
                {"$set": {"patient_type": new_type}},
            )
    else:
        patient_id = ""
        source     = "Website"

    dpms_appt = {
        "patient_id":        patient_id,
        "patient_name":      payload.full_name,
        "phone":             payload.phone,
        "email":             payload.email,
        "age":               payload.age,
        "gender":            payload.gender,
        "address":           payload.address,
        "consultation_type": payload.consultation_type,
        "date_time":         payload.preferred_date or "Pending",
        "therapist":         "Website Booking",
        "treatment":         payload.treatment,
        "message":           payload.message,
        "status":            "New",
        "source":            source,
        "created_at":        datetime.now(timezone.utc),
    }
    await dpms_db.appointments.insert_one(dpms_appt)

    # Confirmation email / SMS go out after the response, so booking isn't slowed down
    background_tasks.add_task(
        send_booking_notifications,
        phone=payload.phone,
        email=payload.email,
        name=payload.full_name,
        treatment=payload.treatment,
        preferred_date=payload.preferred_date or "",
        ctype=payload.consultation_type,
        ref=appt.id,
    )
    return appt


# Post-visit notification endpoint
@router.post("/notify/post-visit")
async def notify_post_visit(payload: PostVisitNotify):
    """
    Called by the DPMS frontend after a consultation is saved.
    Sends a thank-you SMS + email with the next visit date.
    """
    asyncio.create_task(send_post_visit_notifications(
        phone=payload.phone,
        email=payload.email,
        name=payload.name,
        treatment=payload.treatment,
        next_visit=payload.next_visit or "",
    ))
    return {"ok": True, "msg": "Post-visit notification queued"}


# DPMS Appointments (read / update from dpms.appointments)
@router.get("/appointments")
async def get_all_appointments(
    source: Optional[str] = None,
    patient_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    _verify_jwt(authorization)
    query = {}
    if source:
        query["source"] = source
    if patient_id:
        query["patient_id"] = patient_id
        
    appts = []
    async for a in dpms_db.appointments.find(query).sort("created_at", -1).limit(200):
        a["_id"] = str(a["_id"])
        appts.append(a)
    return {"items": appts}

@router.put("/appointments/{appt_id}")
async def update_dpms_appointment(
    appt_id: str,
    body: dict,
    authorization: Optional[str] = Header(default=None),
):
    """Update status of a DPMS appointment by _id string."""
    from bson import ObjectId
    try:
        oid = ObjectId(appt_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid appointment id")

    result = await dpms_db.appointments.update_one(
        {"_id": oid},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}


# DPMS Patients
