from pydantic import BaseModel, Field, ConfigDict, EmailStr, BeforeValidator, field_validator
from typing import Annotated, List, Literal, Optional
import uuid
from datetime import datetime, timezone

# bcrypt only accepts up to 72 bytes; bcrypt 5 raises an error beyond that.
BCRYPT_MAX_BYTES = 72


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

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        # Checked in bytes, not characters: non-ASCII characters take 2-4 bytes each.
        if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError(f"Password is too long (maximum {BCRYPT_MAX_BYTES} bytes)")
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class AppointmentCreate(BaseModel):
    full_name:         str          = Field(..., min_length=2, max_length=120)
    phone:             str          = Field(..., min_length=7, max_length=20)
    email:             Optional[EmailStr] = None
    age:               int          = Field(..., ge=0, le=120)
    gender:            str
    address:           Optional[str] = Field(default=None, max_length=500)
    # The website sends "online" or "walk_in" (clinic visit).
    consultation_type: Literal["online", "walk_in"] = "online"
    treatment:         str           = Field(..., min_length=2, max_length=120)
    preferred_date:    Annotated[Optional[str], BeforeValidator(_blank_to_none)] = Field(default=None, max_length=40)
    message:           Optional[str] = Field(default="", max_length=2000)

    @field_validator("preferred_date")
    @classmethod
    def preferred_date_is_iso(cls, v: Optional[str]) -> Optional[str]:
        # Kept as a string (BSON can't store a bare date), but it must parse,
        # because the admin panel and emails format it as a date.
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))  # accepts "2026-11-20" and full datetimes
        except ValueError:
            raise ValueError("Preferred date must be a valid date (YYYY-MM-DD)")
        return v

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
    # Older clients also send "phone" (used by the removed SMS feature); it is ignored.
    email:      Optional[str] = None
    name:       str
    treatment:  str
    next_visit: Optional[str] = None   # ISO datetime string or empty

class VisitMedicine(BaseModel):
    """One line on a visit's medicine bill. The admin panel sends the whole catalogue
    entry (_id, type, composition...) and the extra fields are stored too. Only name
    and price are checked, since the bill total uses them."""
    model_config = ConfigDict(extra="allow")
    name:  str   = Field(..., min_length=1, max_length=100)
    price: float = Field(default=0.0, ge=0)

class VisitCreate(BaseModel):
    """One consultation. Stored inside the patient's `visits` array."""
    date_of_visit:    Optional[str] = None
    treatment:        str = ""
    doctor_notes:     Optional[str] = ""
    doctor_advice:    Optional[str] = ""
    next_visit:       Optional[str] = None
    photos:           List[str] = []
    videos:           List[str] = []
    medicines:        List[VisitMedicine] = []
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
    price:       float = Field(default=0.0, ge=0)
    stock:       int = Field(default=0, ge=0)


class MedicineUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=2, max_length=100)
    composition: Optional[str] = None
    description: Optional[str] = None
    type:        Optional[str] = None
    price:       Optional[float] = Field(None, ge=0)
    stock:       Optional[int] = Field(None, ge=0)
