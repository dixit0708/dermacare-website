from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
import re
from bson import ObjectId
from pymongo import ReturnDocument

from app import rate_limit
from app.config import BOOKINGS_PER_IP_PER_HOUR, BOOKINGS_PER_EMAIL_PER_DAY
from app.database import db, dpms_db
from app.models import Appointment, AppointmentCreate, AppointmentUpdate, PostVisitNotify
from app.security import get_current_user
from app.services.notifications import send_booking_confirmation, send_thank_you_email


router = APIRouter()

# Values of dpms.appointments "source". The admin panel filters on the same strings.
SOURCE_NEW_PATIENT       = "Website"
SOURCE_RETURNING_PATIENT = "Existing Patient Booking"
STATUS_STARTED           = "Consultation Started"


async def _enforce_booking_limits(request: Request, payload: AppointmentCreate) -> None:
    # request.client is the real visitor only if uvicorn trusts the reverse proxy
    # (FORWARDED_ALLOW_IPS); otherwise every visitor shares the proxy's address.
    ip = request.client.host if request.client else "unknown"
    limits = [("booking-ip", ip, BOOKINGS_PER_IP_PER_HOUR, 3600)]
    if payload.email:
        limits.append(("booking-email", payload.email.lower(), BOOKINGS_PER_EMAIL_PER_DAY, 86400))
    for scope, identity, limit, window in limits:
        retry_after = await rate_limit.hit(scope, identity, limit, window)
        if retry_after:
            raise HTTPException(
                status_code=429,
                detail={"msg": "Too many booking requests. Please try again later or call the clinic."},
                headers={"Retry-After": str(retry_after)},
            )


# Public: called by the booking form on the website, so no login here.
@router.post("/appointments", response_model=Appointment)
async def create_appointment(payload: AppointmentCreate, request: Request, background_tasks: BackgroundTasks):
    await _enforce_booking_limits(request, payload)

    booking = Appointment(**payload.model_dump())
    await db.appointments.insert_one(booking.model_dump())

    # The clinic's copy in dpms. A returning patient (same WhatsApp number and name)
    # is linked here, but their record is not changed by this anonymous request.
    returning_patient = await dpms_db.patients.find_one({
        "whatsapp": payload.phone,
        "full_name": {"$regex": f"^{re.escape(payload.full_name)}$", "$options": "i"},
    })
    await dpms_db.appointments.insert_one({
        "patient_id":        returning_patient.get("patient_id") if returning_patient else "",
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
        "source":            SOURCE_RETURNING_PATIENT if returning_patient else SOURCE_NEW_PATIENT,
        "created_at":        datetime.now(timezone.utc),
    })

    # Sent after the response, so a slow mail server doesn't slow down booking.
    background_tasks.add_task(
        send_booking_confirmation,
        email=payload.email,
        name=payload.full_name,
        phone=payload.phone,
        treatment=payload.treatment,
        preferred_date=payload.preferred_date or "",
        consultation_type=payload.consultation_type,
        ref=booking.id,
    )
    return booking


@router.post("/notify/post-visit", dependencies=[Depends(get_current_user)])
async def notify_post_visit(payload: PostVisitNotify, background_tasks: BackgroundTasks):
    """Called by the admin panel after a consultation is saved."""
    background_tasks.add_task(
        send_thank_you_email,
        email=payload.email,
        name=payload.name,
        treatment=payload.treatment,
        next_visit=payload.next_visit or "",
    )
    return {"ok": True, "msg": "Post-visit notification queued"}


@router.get("/appointments", dependencies=[Depends(get_current_user)])
async def list_clinic_appointments(
    source: Optional[str] = None,
    patient_id: Optional[str] = None,
):
    query = {}
    if source:
        query["source"] = source
    if patient_id:
        query["patient_id"] = patient_id

    appointments = []
    async for appt in dpms_db.appointments.find(query).sort("created_at", -1).limit(200):
        appt["_id"] = str(appt["_id"])
        appointments.append(appt)
    return {"items": appointments}


@router.put("/appointments/{appt_id}", dependencies=[Depends(get_current_user)])
async def update_clinic_appointment(appt_id: str, payload: AppointmentUpdate):
    if not ObjectId.is_valid(appt_id):
        raise HTTPException(status_code=400, detail="Invalid appointment id")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return {"ok": True}

    before = await dpms_db.appointments.find_one_and_update(
        {"_id": ObjectId(appt_id)},
        {"$set": changes},
        return_document=ReturnDocument.BEFORE,
    )
    if before is None:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # A returning patient's online/clinic type follows their new booking, but only
    # once a logged-in doctor starts the consultation (never from the public form).
    # Read from the document *before* this update, so linking a newly registered
    # patient (source "Website") never overrides the type the doctor chose.
    if (changes.get("status") == STATUS_STARTED
            and before.get("source") == SOURCE_RETURNING_PATIENT
            and before.get("patient_id")):
        new_type = "online" if before.get("consultation_type") == "online" else "offline"
        await dpms_db.patients.update_one(
            {"patient_id": before["patient_id"], "patient_type": {"$ne": new_type}},
            {"$set": {"patient_type": new_type}},
        )
    return {"ok": True}
