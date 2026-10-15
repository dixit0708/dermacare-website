from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

class UserRegister(BaseModel):
    username:  str = Field(..., min_length=3, max_length=50)
    password:  str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    role:      str = Field(default="Doctor")

class UserLogin(BaseModel):
    username: str
    password: str

class AppointmentCreate(BaseModel):
    full_name:         str          = Field(..., min_length=2, max_length=120)
    phone:             str          = Field(..., min_length=7, max_length=20)
    email:             Optional[EmailStr] = None
    age:               int
    gender:            str
    address:           Optional[str] = None
    consultation_type: str           = Field(default="online")
    treatment:         str           = Field(..., min_length=2, max_length=120)
    preferred_date:    Optional[str] = None
    message:           Optional[str] = Field(default="", max_length=2000)

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:                str           = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name:         str
    phone:             str
    email:             Optional[str] = None
    age:               int
    gender:            str
    address:           Optional[str] = None
    consultation_type: str           = "online"
    treatment:         str
    preferred_date:    Optional[str] = None
    message:           Optional[str] = ""
    status:            str           = "new"
    created_at:        str           = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AppointmentStatusUpdate(BaseModel):
    status: str

class PostVisitNotify(BaseModel):
    phone:      str
    email:      Optional[str] = None
    name:       str
    treatment:  str
    next_visit: Optional[str] = None   # ISO datetime string or empty

class PatientCreate(BaseModel):
    full_name:    str = Field(..., min_length=2, max_length=100)
    phone:        Optional[str] = None
    whatsapp:     Optional[str] = None
    age:          int
    gender:       str
    address:      Optional[str] = None
    patient_type: str = Field(default="offline")
    treatment:    str
    photo_url:    Optional[str] = None
    video_url:    Optional[str] = None

class PatientUpdate(BaseModel):
    full_name:    Optional[str] = Field(None, min_length=2, max_length=100)
    phone:        Optional[str] = None
    whatsapp:     Optional[str] = None
    age:          Optional[int] = None
    gender:       Optional[str] = None
    address:      Optional[str] = None
    patient_type: Optional[str] = None
    treatment:    Optional[str] = None
    photo_url:    Optional[str] = None
    video_url:    Optional[str] = None

class MedicineCreate(BaseModel):
    name:        str = Field(..., min_length=2, max_length=100)
    composition: Optional[str] = None
    type:        str = Field(default="tablet")
    price:       float = Field(default=0.0)
    stock:       int = Field(default=0)


class MedicineUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=2, max_length=100)
    composition: Optional[str] = None
    type:        Optional[str] = None
    price:       Optional[float] = None
    stock:       Optional[int] = None

class PatientUpdate(BaseModel):
    full_name:   Optional[str] = None
    whatsapp:    Optional[str] = None
    age:         Optional[int] = None
    gender:      Optional[str] = None
    patient_type:Optional[str] = None
    address:     Optional[str] = None
    medical_history: Optional[str] = None
