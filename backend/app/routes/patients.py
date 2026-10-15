from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
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


def _clean(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/patients")
async def get_patients(
    patient_type: Optional[str] = None,
    name: Optional[str] = None,
    whatsapp: Optional[str] = None,
    patient_id: Optional[str] = None,
):
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
        patients.append(_clean(p))
    return {"items": patients}

@router.post("/patients")
async def create_patient(payload: PatientCreate):
    if payload.whatsapp:
        existing = await dpms_db.patients.find_one({"whatsapp": payload.whatsapp})
        if existing:
            raise HTTPException(status_code=409, detail={"duplicate": True, "msg": "Patient already exists", "patient_id": existing.get("patient_id", str(existing["_id"]))})

    # The registration form also records the first consultation: it becomes visit #1.
    data = payload.model_dump(exclude=VISIT_FIELDS - {"treatment"})
    visit = _new_visit(payload.model_dump(include=VISIT_FIELDS))
    data["patient_id"] = await _next_patient_id()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["visits"] = [visit]
    data["next_visit"] = visit["next_visit"]

    await dpms_db.patients.insert_one(data)
    return _clean(data)

@router.get("/patients/{pid}")
async def get_patient(pid: str):
    doc = await dpms_db.patients.find_one(_patient_filter(pid))
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _clean(doc)

@router.put("/patients/{pid}")
async def update_patient(pid: str, payload: PatientUpdate):
    fields = payload.model_dump(exclude_unset=True, exclude={"visit"})
    update_data = {}
    if fields:
        update_data["$set"] = fields

    if payload.visit:
        visit = _new_visit(payload.visit.model_dump())
        update_data["$push"] = {"visits": visit}
        update_data.setdefault("$set", {})["next_visit"] = visit["next_visit"]

    if not update_data:
        return {"msg": "Nothing to update"}

    doc = await dpms_db.patients.find_one_and_update(
        _patient_filter(pid),
        update_data,
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _clean(doc)

@router.delete("/patients/{pid}", dependencies=[Depends(require_admin)])
async def delete_patient(pid: str):
    result = await dpms_db.patients.delete_one(_patient_filter(pid))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}

@router.patch("/patients/{pid}/visit-dispatch")
async def update_visit_dispatch(pid: str, payload: VisitDispatchUpdate):
    # visits.$ is the array element matched by "visits.visit_id" in the query.
    query = {**_patient_filter(pid), "visits.visit_id": payload.visit_id}
    update = {"$set": {"visits.$.dispatch_date": payload.dispatch_date, "visits.$.tracking_id": payload.tracking_id}}
    res = await dpms_db.patients.update_one(query, update)
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient/Visit not found")
    return {"ok": True}
