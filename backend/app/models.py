from pydantic import BaseModel, Field, ConfigDict, EmailStr, BeforeValidator
from typing import Annotated, List, Literal, Optional
import uuid
from datetime import datetime, timezone


# HTML forms send "" for fields left empty; treat that as "not given".
def _blank_to_none(v):
    return None if isinstance(v, str) and v.strip() == "" else v

OptionalInt   = Annotated[Optional[int], BeforeValidator(_blank_to_none)]
OptionalFloat = Annotated[Optional[float], BeforeValidator(_blank_to_none)]
OptionalEmail = Annotated[Optional[EmailStr], BeforeValidator(_blank_to_none)]


class UserRegister(BaseModel):
    username:    str = Field(..., min_length=3, max_length=50)
    password:    str = Field(..., min_length=6)
    full_name:   str = Field(..., min_length=2, max_length=100)
    signup_code: str

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

class AppointmentUpdate(BaseModel):
    # Only these fields can be changed from the admin panel.
    status:     Optional[Literal["New", "Consultation Started", "Completed", "No Show", "Cancelled"]] = None
    patient_id: Optional[str] = None
    source:     Optional[str] = None

class PostVisitNotify(BaseModel):
    phone:      str
    email:      Optional[str] = None
    name:       str
    treatment:  str
    next_visit: Optional[str] = None   # ISO datetime string or empty

class VisitCreate(BaseModel):
    """One consultation. Stored inside the patient's `visits` array."""
    date_of_visit:    Optional[str] = None
    treatment:        str = ""
    doctor_notes:     Optional[str] = ""
    doctor_advice:    Optional[str] = ""
    next_visit:       Optional[str] = None
    photos:           List[str] = []
    videos:           List[str] = []
    medicines:        List[dict] = []
    blood_tests:      List[str] = []
    # Online patients only
    payment_datetime: Optional[str] = None
    amount_paid:      OptionalFloat = None
    dispatch_date:    Optional[str] = None
    tracking_id:      Optional[str] = None

class PatientCreate(VisitCreate):
    """Registration form: the patient's details plus their first consultation."""
    full_name:       str = Field(..., min_length=2, max_length=100)
    phone:           Optional[str] = None
    whatsapp:        Optional[str] = None
    email:           OptionalEmail = None
    age:             int
    gender:          str
    address:         Optional[str] = None
    patient_type:    Literal["online", "offline"] = "offline"
    medical_history: Optional[str] = ""
    current_issues:  Optional[str] = ""
    treatment:       str = Field(..., min_length=1)

class PatientUpdate(BaseModel):
    full_name:       Optional[str] = Field(None, min_length=2, max_length=100)
    phone:           Optional[str] = None
    whatsapp:        Optional[str] = None
    email:           OptionalEmail = None
    age:             OptionalInt = None
    gender:          Optional[str] = None
    address:         Optional[str] = None
    patient_type:    Optional[Literal["online", "offline"]] = None
    medical_history: Optional[str] = None
    current_issues:  Optional[str] = None
    treatment:       Optional[str] = None
    # When present, this consultation is added to the patient's visits.
    visit:           Optional[VisitCreate] = None

class VisitDispatchUpdate(BaseModel):
    visit_id:      str
    dispatch_date: Optional[str] = None
    tracking_id:   Optional[str] = None

class MedicineCreate(BaseModel):
    name:        str = Field(..., min_length=2, max_length=100)
    composition: Optional[str] = None
    description: Optional[str] = None
    type:        str = Field(default="tablet")
    price:       float = Field(default=0.0)
    stock:       int = Field(default=0)


class MedicineUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=2, max_length=100)
    composition: Optional[str] = None
    description: Optional[str] = None
    type:        Optional[str] = None
    price:       Optional[float] = None
    stock:       Optional[int] = None
