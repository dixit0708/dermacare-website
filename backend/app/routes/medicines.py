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
    meds = []
    async for m in dpms_db.medicines.find():
        m["_id"] = str(m["_id"])
        meds.append(m)
    return {"medicines": meds}

@router.post("/medicines")
async def create_medicine(payload: MedicineCreate):
    data = payload.model_dump()
    res = await dpms_db.medicines.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return data

@router.put("/medicines/{mid}")
async def update_medicine(mid: str, payload: MedicineUpdate):
    oid = _object_id(mid)
    data = payload.model_dump(exclude_unset=True)
    if data:
        await dpms_db.medicines.update_one({"_id": oid}, {"$set": data})
    return {"ok": True}

@router.delete("/medicines/{mid}")
async def delete_medicine(mid: str):
    res = await dpms_db.medicines.delete_one({"_id": _object_id(mid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"ok": True}
