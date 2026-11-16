from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import re
import uuid
from bson import ObjectId
from pymongo import ReturnDocument

from app.database import dpms_db
from app.models import PatientCreate, PatientUpdate, VisitCreate, VisitDispatchUpdate
from app.security import get_current_user, require_admin

# Every patient endpoint needs a logged-in user.
router = APIRouter(dependencies=[Depends(get_current_user)])

VISIT_FIELDS = set(VisitCreate.model_fields)


def _patient_filter(pid: str) -> dict:
    """Patients are addressed by their PT-xxxxx id; older links may use the Mongo _id."""
    if ObjectId.is_valid(pid):
        return {"$or": [{"patient_id": pid}, {"_id": ObjectId(pid)}]}
    return {"patient_id": pid}


async def _next_patient_id() -> str:
    # $inc is atomic, so two registrations at the same moment never get the same number.
    while True:
        counter = await dpms_db.counters.find_one_and_update(
            {"_id": "patient_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        pid = f"PT-{counter['seq']:05d}"
        # Older records used random IDs; skip any number that's already taken.
        if not await dpms_db.patients.find_one({"patient_id": pid}, {"_id": 1}):
            return pid


def _new_visit(visit: dict) -> dict:
    now = datetime.now(timezone.utc)
    visit["visit_id"] = str(uuid.uuid4())
    visit["created_at"] = now.isoformat()
    if not visit.get("date_of_visit"):
        visit["date_of_visit"] = now.isoformat()
    if not visit.get("next_visit"):
        visit["next_visit"] = (now + timedelta(days=30)).isoformat()
    return visit


def _with_str_id(doc: dict) -> dict:
    # ObjectId isn't JSON-serialisable; the panel uses the string form.
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/patients")
async def get_patients(
    patient_type: Optional[str] = None,
    name: Optional[str] = None,
    whatsapp: Optional[str] = None,
    patient_id: Optional[str] = None,
):
    # Search terms are matched as plain text ("contains"). re.escape stops characters
    # such as "(" or "+" from being read as regex syntax, which would error or run slowly.
    query = {}
    if patient_type:
        query["patient_type"] = patient_type
    if name:
        query["full_name"] = {"$regex": re.escape(name), "$options": "i"}
    if whatsapp:
        query["whatsapp"] = {"$regex": re.escape(whatsapp)}
    if patient_id:
        query["patient_id"] = {"$regex": re.escape(patient_id), "$options": "i"}

    patients = []
    async for p in dpms_db.patients.find(query).sort("created_at", -1).limit(100):
        patients.append(_with_str_id(p))
    return {"items": patients}

@router.post("/patients")
async def create_patient(payload: PatientCreate):
    if payload.whatsapp:
        existing = await dpms_db.patients.find_one({"whatsapp": payload.whatsapp})
        if existing:
            raise HTTPException(status_code=409, detail={"duplicate": True, "msg": "Patient already exists", "patient_id": existing.get("patient_id", str(existing["_id"]))})

    # The registration form also records the first consultation: it becomes visit #1.
    # The top-level "treatment" is kept as well, as the patient's main treatment.
    patient = payload.model_dump(exclude=VISIT_FIELDS - {"treatment"})
    first_visit = _new_visit(payload.model_dump(include=VISIT_FIELDS))
    patient["patient_id"] = await _next_patient_id()
    patient["created_at"] = datetime.now(timezone.utc).isoformat()
    patient["visits"] = [first_visit]
    patient["next_visit"] = first_visit["next_visit"]

    await dpms_db.patients.insert_one(patient)
    return _with_str_id(patient)

@router.get("/patients/{pid}")
async def get_patient(pid: str):
    doc = await dpms_db.patients.find_one(_patient_filter(pid))
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _with_str_id(doc)

@router.put("/patients/{pid}")
async def update_patient(pid: str, payload: PatientUpdate):
    # Detail edits and a new visit go into one atomic update.
    detail_changes = payload.model_dump(exclude_unset=True, exclude={"visit"})
    update = {}
    if detail_changes:
        update["$set"] = detail_changes

    if payload.visit:
        visit = _new_visit(payload.visit.model_dump())
        update["$push"] = {"visits": visit}
        update.setdefault("$set", {})["next_visit"] = visit["next_visit"]

    if not update:
        return {"msg": "Nothing to update"}

    doc = await dpms_db.patients.find_one_and_update(
        _patient_filter(pid),
        update,
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _with_str_id(doc)

@router.delete("/patients/{pid}", dependencies=[Depends(require_admin)])
async def delete_patient(pid: str):
    deleted = await dpms_db.patients.delete_one(_patient_filter(pid))
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}

@router.patch("/patients/{pid}/visit-dispatch")
async def update_visit_dispatch(pid: str, payload: VisitDispatchUpdate):
    # visits.$ is the array element matched by "visits.visit_id" in the query.
    query = {**_patient_filter(pid), "visits.visit_id": payload.visit_id}
    update = {"$set": {"visits.$.dispatch_date": payload.dispatch_date, "visits.$.tracking_id": payload.tracking_id}}
    updated = await dpms_db.patients.update_one(query, update)
    if updated.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient/Visit not found")
    return {"ok": True}
