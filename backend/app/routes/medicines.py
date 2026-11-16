from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from app.database import dpms_db
from app.models import MedicineCreate, MedicineUpdate
from app.security import get_current_user

# Every medicine endpoint needs a logged-in user.
router = APIRouter(dependencies=[Depends(get_current_user)])


def _object_id(mid: str) -> ObjectId:
    if not ObjectId.is_valid(mid):
        raise HTTPException(status_code=400, detail="Invalid ID")
    return ObjectId(mid)


@router.get("/medicines")
async def get_medicines():
    medicines = []
    async for medicine in dpms_db.medicines.find():
        medicine["_id"] = str(medicine["_id"])
        medicines.append(medicine)
    return {"medicines": medicines}

@router.post("/medicines")
async def create_medicine(payload: MedicineCreate):
    medicine = payload.model_dump()
    inserted = await dpms_db.medicines.insert_one(medicine)
    medicine["_id"] = str(inserted.inserted_id)
    return medicine

@router.put("/medicines/{mid}")
async def update_medicine(mid: str, payload: MedicineUpdate):
    oid = _object_id(mid)
    changes = payload.model_dump(exclude_unset=True)
    if changes:
        matched = (await dpms_db.medicines.update_one({"_id": oid}, {"$set": changes})).matched_count
    else:  # nothing to change, but a missing medicine is still a 404
        matched = await dpms_db.medicines.count_documents({"_id": oid}, limit=1)
    if not matched:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"ok": True}

@router.delete("/medicines/{mid}")
async def delete_medicine(mid: str):
    deleted = await dpms_db.medicines.delete_one({"_id": _object_id(mid)})
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"ok": True}
