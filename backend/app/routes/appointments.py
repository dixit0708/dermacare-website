from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import re
from bson import ObjectId

from app.database import db, dpms_db
from app.models import Appointment, AppointmentCreate, AppointmentUpdate, PostVisitNotify
from app.security import get_current_user
from app.services.notifications import send_booking_notifications, send_post_visit_notifications


router = APIRouter()

# Public: called by the booking form on the website, so no login here.
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
@router.post("/notify/post-visit", dependencies=[Depends(get_current_user)])
async def notify_post_visit(payload: PostVisitNotify, background_tasks: BackgroundTasks):
    """
    Called by the DPMS frontend after a consultation is saved.
    Sends a thank-you SMS + email with the next visit date.
    """
    background_tasks.add_task(
        send_post_visit_notifications,
        phone=payload.phone,
        email=payload.email,
        name=payload.name,
        treatment=payload.treatment,
        next_visit=payload.next_visit or "",
    )
    return {"ok": True, "msg": "Post-visit notification queued"}


# DPMS Appointments (read / update from dpms.appointments)
@router.get("/appointments", dependencies=[Depends(get_current_user)])
async def get_all_appointments(
    source: Optional[str] = None,
    patient_id: Optional[str] = None,
):
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

@router.put("/appointments/{appt_id}", dependencies=[Depends(get_current_user)])
async def update_dpms_appointment(appt_id: str, payload: AppointmentUpdate):
    """Update status / linked patient of a DPMS appointment by _id string."""
    if not ObjectId.is_valid(appt_id):
        raise HTTPException(status_code=400, detail="Invalid appointment id")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return {"ok": True}

    result = await dpms_db.appointments.update_one(
        {"_id": ObjectId(appt_id)},
        {"$set": data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}
