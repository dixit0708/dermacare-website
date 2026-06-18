from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import httpx
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ===== Logging (must be before any logger usage) =====
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== Environment =====
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'chauhan_clinic')]
dpms_db = client["dpms"]

app = FastAPI(title="Dr Chauhan Clinic API")
api_router = APIRouter(prefix="/api")

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "chauhan-clinic-admin-2025")
JWT_SECRET  = os.environ.get("JWT_SECRET",  "dermacare-jwt-secret-2025")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_HOURS = 24

# ===== SMTP Config =====
SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

# ===== MSG91 Config =====
MSG91_AUTHKEY = os.environ.get("MSG91_AUTHKEY", "")
MSG91_SENDER  = os.environ.get("MSG91_SENDER", "CLINIC")
MSG91_COUNTRY = os.environ.get("MSG91_COUNTRY", "91")


# ─────────────────────────────────────────────
#  HELPERS — phone normalisation
# ─────────────────────────────────────────────
def _normalise_phone(phone: str) -> str:
    clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not clean.startswith(MSG91_COUNTRY):
        clean = MSG91_COUNTRY + clean
    return clean


def _fmt_date(dt_str: str) -> str:
    """Convert ISO / raw date string to human readable format."""
    if not dt_str or dt_str == "Pending":
        return "To be confirmed"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return dt_str


# ─────────────────────────────────────────────
#  LOW-LEVEL SEND FUNCTIONS
# ─────────────────────────────────────────────
async def _send_sms_raw(phone: str, message: str):
    """Send a single SMS via MSG91."""
    if not MSG91_AUTHKEY or not phone:
        logger.warning("SMS skipped: missing authkey or phone")
        return
    clean = _normalise_phone(phone)
    payload = {
        "sender": MSG91_SENDER,
        "route": "4",
        "country": MSG91_COUNTRY,
        "sms": [{"message": message, "to": [clean]}],
    }
    headers = {"authkey": MSG91_AUTHKEY, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10) as hclient:
            resp = await hclient.post(
                "https://api.msg91.com/api/v2/sendsms", json=payload, headers=headers
            )
            logger.info(f"SMS → {clean}: {resp.text}")
    except Exception as e:
        logger.error(f"SMS failed: {e}")


def _send_email_sync(to_email: str, subject: str, html_body: str):
    """Send HTML email via Gmail SMTP (blocking — run in executor)."""
    if not SMTP_USER or not SMTP_PASSWORD or not to_email:
        logger.warning("Email skipped: missing SMTP config or recipient")
        return
    try:
        import re
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = to_email

        # Create a plain-text fallback to lower spam score
        plain_text = re.sub(r'<[^>]+>', ' ', html_body) # Strip HTML tags
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        
        # Attach plain text first, then HTML (MIME spec requirement)
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as srv:
            srv.ehlo(); srv.starttls(); srv.login(SMTP_USER, SMTP_PASSWORD)
            srv.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info(f"Email → {to_email}")
    except Exception as e:
        logger.error(f"Email failed: {e}")


async def _send_email_async(to_email: str, subject: str, html_body: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_sync, to_email, subject, html_body)


# ─────────────────────────────────────────────
#  1. APPOINTMENT BOOKING CONFIRMATION
# ─────────────────────────────────────────────
def _booking_email_html(name: str, treatment: str, date_str: str, ctype: str) -> str:
    ctype_label = "Online Consultation" if ctype == "online" else "Walk-in / Clinic Visit"
    return f"""
    <html><body style="font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:0;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 32px 24px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Appointment Confirmed ✅</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;">Dr. Chauhan Clinic &amp; Therapy Center</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#1e293b;font-size:16px;">Dear <strong>{name}</strong>,</p>
        <p style="color:#475569;">Thank you for booking an appointment. Here are your details:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:10px 12px;background:#f8fafc;color:#64748b;width:40%;">Treatment</td>
              <td style="padding:10px 12px;background:#f8fafc;color:#1e293b;font-weight:600;">{treatment}</td></tr>
          <tr><td style="padding:10px 12px;color:#64748b;">Type</td>
              <td style="padding:10px 12px;color:#1e293b;font-weight:600;">{ctype_label}</td></tr>
          <tr><td style="padding:10px 12px;background:#f8fafc;color:#64748b;">Preferred Date</td>
              <td style="padding:10px 12px;background:#f8fafc;color:#1e293b;font-weight:600;">{date_str}</td></tr>
        </table>
        <div style="background:#eff6ff;border-left:4px solid #6366f1;padding:14px 18px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;color:#3730a3;font-size:14px;">📞 For queries, reach us on WhatsApp or call our clinic directly.</p>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:28px;">Warm regards,<br>
           <strong>Dr. Chauhan Clinic &amp; Therapy Center</strong></p>
      </div>
    </div>
    </body></html>"""


async def send_booking_notifications(phone: str, email: Optional[str], name: str,
                                     treatment: str, preferred_date: str, ctype: str):
    date_str = _fmt_date(preferred_date) if preferred_date else "To be confirmed"
    # SMS
    sms_msg = (
        f"Dear {name}, your appointment for {treatment} at Dr. Chauhan Clinic "
        f"has been received for the {date_str}. Thank you!"
    )
    asyncio.create_task(_send_sms_raw(phone, sms_msg))
    # Email
    if email:
        html = _booking_email_html(name, treatment, date_str, ctype)
        asyncio.create_task(
            _send_email_async(email, "Appointment Confirmed - Dr. Chauhan Clinic", html)
        )


# ─────────────────────────────────────────────
#  2. POST-CONSULTATION THANK YOU
# ─────────────────────────────────────────────
def _post_visit_email_html(name: str, treatment: str, next_visit: str) -> str:
    nv = _fmt_date(next_visit) if next_visit else None
    next_block = (
        f'<p style="color:#1e293b;font-weight:600;">Your next consultation is scheduled for: '
        f'<span style="color:#6366f1;">{nv}</span></p>'
        if nv else
        '<p style="color:#475569;">We will reach out to schedule your next visit soon.</p>'
    )
    return f"""
    <html><body style="font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:0;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 32px 24px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Thank You for Visiting! 🙏</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;">Dr. Chauhan Clinic &amp; Therapy Center</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#1e293b;font-size:16px;">Dear <strong>{name}</strong>,</p>
        <p style="color:#475569;">
          Thank you for visiting Dr. Chauhan Clinic for your <strong>{treatment}</strong> session.
          We hope your experience was comfortable and beneficial.
        </p>
        {next_block}
        <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:14px 18px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;color:#065f46;font-size:14px;">
            💊 Please follow the doctor's advice and complete your prescribed course.
          </p>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:28px;">Warm regards,<br>
           <strong>Dr. Chauhan Clinic &amp; Therapy Center</strong></p>
      </div>
    </div>
    </body></html>"""


async def send_post_visit_notifications(phone: str, email: Optional[str],
                                        name: str, treatment: str, next_visit: str):
    nv_str = _fmt_date(next_visit) if next_visit else None
    if nv_str:
        sms_msg = (
            f"Dear {name}, thank you for visiting Dr. Chauhan Clinic for your {treatment} session. "
            f"Your next consultation is scheduled for {nv_str}. See you soon!"
        )
    else:
        sms_msg = (
            f"Dear {name}, thank you for visiting Dr. Chauhan Clinic for your {treatment} session. "
            f"We will reach out to schedule your next visit. Take care!"
        )
    asyncio.create_task(_send_sms_raw(phone, sms_msg))
    if email:
        html = _post_visit_email_html(name, treatment, next_visit)
        asyncio.create_task(
            _send_email_async(email, "Thank You for Visiting - Dr. Chauhan Clinic", html)
        )


# ─────────────────────────────────────────────
#  3. 2-DAY REMINDER (scheduled daily at 9 AM)
# ─────────────────────────────────────────────
async def daily_reminder_job():
    """Runs every day at 9 AM — sends SMS+email reminders 2 days before next_visit."""
    logger.info("Running daily 2-day reminder job...")
    now = datetime.now(timezone.utc)
    # Window: next_visit is between 47h and 49h from now (±1 hour around 48h)
    window_start = now + timedelta(hours=47)
    window_end   = now + timedelta(hours=49)
    try:
        cursor = dpms_db.patients.find({
            "next_visit": {
                "$gte": window_start.isoformat(),
                "$lt":  window_end.isoformat(),
            }
        })
        patients = await cursor.to_list(length=500)
        logger.info(f"Reminder job: found {len(patients)} patients with upcoming visit")
        for p in patients:
            phone      = p.get("whatsapp") or p.get("phone", "")
            email      = p.get("email")
            name       = p.get("full_name", "Patient")
            next_visit = p.get("next_visit", "")
            nv_str     = _fmt_date(next_visit)
            sms_msg = (
                f"Dear {name}, this is a reminder that your next consultation at "
                f"Dr. Chauhan Clinic is on {nv_str}. Please be on time. See you soon!"
            )
            await _send_sms_raw(phone, sms_msg)
            if email:
                html = _reminder_email_html(name, nv_str)
                await _send_email_async(
                    email, "Appointment Reminder - Dr. Chauhan Clinic", html
                )
    except Exception as e:
        logger.error(f"Reminder job error: {e}")


def _reminder_email_html(name: str, nv_str: str) -> str:
    return f"""
    <html><body style="font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:0;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 32px 24px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Appointment Reminder 🔔</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;">Dr. Chauhan Clinic &amp; Therapy Center</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#1e293b;font-size:16px;">Dear <strong>{name}</strong>,</p>
        <p style="color:#475569;">
          This is a friendly reminder that your next consultation at Dr. Chauhan Clinic
          is scheduled in <strong>2 days</strong>.
        </p>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;color:#92400e;font-size:15px;font-weight:600;">
            📅 {nv_str}
          </p>
        </div>
        <p style="color:#475569;">Please ensure you arrive on time. If you need to reschedule, contact us at your earliest convenience.</p>
        <p style="color:#94a3b8;font-size:13px;margin-top:28px;">Warm regards,<br>
           <strong>Dr. Chauhan Clinic &amp; Therapy Center</strong></p>
      </div>
    </div>
    </body></html>"""


# ─────────────────────────────────────────────
#  MODELS
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "Dr Chauhan Clinic API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# ── Auth ──────────────────────────────────────
@api_router.post("/auth/register")
async def register(payload: UserRegister):
    existing = await db.users.find_one({"username": payload.username})
    if existing:
        raise HTTPException(status_code=400, detail={"msg": "Username already exists"})
    hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    user_doc = {
        "id":            str(uuid.uuid4()),
        "username":      payload.username,
        "password_hash": hashed,
        "full_name":     payload.full_name,
        "role":          payload.role,
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    return {"ok": True, "msg": "Account created successfully"}


@api_router.post("/auth/login")
async def login(payload: UserLogin):
    user = await db.users.find_one({"username": payload.username})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail={"msg": "Invalid username or password"})
    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail={"msg": "Invalid username or password"})
    token_data = {
        "sub":       user["id"],
        "username":  user["username"],
        "full_name": user["full_name"],
        "role":      user["role"],
        "exp":       datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


def _verify_jwt(auth_header: Optional[str]) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ── Appointments (website booking) ────────────
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(payload: AppointmentCreate):
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

    # Fire-and-forget notifications
    await send_booking_notifications(
        phone=payload.phone,
        email=payload.email,
        name=payload.full_name,
        treatment=payload.treatment,
        preferred_date=payload.preferred_date or "",
        ctype=payload.consultation_type,
    )
    return appt


# ── Post-visit notification endpoint ─────────
@api_router.post("/notify/post-visit")
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


# ── DPMS Appointments (read / update from dpms.appointments) ─────────
@api_router.get("/appointments")
async def get_all_appointments(authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    appts = []
    async for a in db.appointments.find().sort("created_at", -1):
        a["_id"] = str(a["_id"])
        appts.append(a)
    return appts

@api_router.put("/appointments/{appt_id}")
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


# ── DPMS Patients ─────────
@api_router.get("/patients")
async def get_patients(authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    patients = []
    async for p in dpms_db.patients.find():
        p["_id"] = str(p["_id"])
        patients.append(p)
    return patients

@api_router.post("/patients")
async def create_patient(payload: PatientCreate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    data = payload.model_dump(exclude_unset=True)
    if data.get("whatsapp"):
        existing = await dpms_db.patients.find_one({"whatsapp": data["whatsapp"]})
        if existing:
            raise HTTPException(status_code=409, detail={"duplicate": True, "msg": "Patient already exists", "patient_id": existing.get("patient_id", str(existing["_id"]))})
    
    import random
    import string
    # Generate simple patient ID e.g. PT-12345
    pid = "PT-" + "".join(random.choices(string.digits, k=5))
    data["patient_id"] = pid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    if "visits" not in data:
        data["visits"] = []
    
    await dpms_db.patients.insert_one(data)
    if "_id" in data:
        data["_id"] = str(data["_id"])
    return data

@api_router.get("/patients/{pid}")
async def get_patient(pid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    doc = await dpms_db.patients.find_one({"patient_id": pid})
    if not doc:
        # Fallback to _id string
        from bson import ObjectId
        try:
            doc = await dpms_db.patients.find_one({"_id": ObjectId(pid)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.put("/patients/{pid}")
async def update_patient(pid: str, request: Request, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    try:
        from bson import ObjectId
        obj_id = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
        
    payload = await request.json()
    visit = payload.pop("visit", None)
    
    # Optional: validate the base patient fields using PatientUpdate
    try:
        validated_data = PatientUpdate(**payload).model_dump(exclude_unset=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
        
    update_data = {}
    if validated_data:
        update_data["$set"] = validated_data
        
    if visit:
        import uuid
        visit["visit_id"] = str(uuid.uuid4())
        visit["created_at"] = datetime.now(timezone.utc).isoformat()
        if "next_visit" not in visit:
            visit["next_visit"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            if "$set" not in update_data:
                update_data["$set"] = {}
            update_data["$set"]["next_visit"] = visit["next_visit"]
            
        update_data["$push"] = {"visits": visit}
        
    if not update_data:
        return {"msg": "Nothing to update"}
    
    doc = await dpms_db.patients.find_one_and_update(
        {"_id": obj_id},
        update_data,
        return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.delete("/patients/{pid}")
async def delete_patient(pid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
    result = await dpms_db.patients.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}

@api_router.patch("/patients/{pid}/visit-dispatch")
async def update_visit_dispatch(pid: str, payload: dict, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    visit_id = payload.get("visit_id")
    dispatch_date = payload.get("dispatch_date")
    tracking_id = payload.get("tracking_id")
    
    from bson import ObjectId
    try:
        oid = ObjectId(pid)
    except:
        raise HTTPException(404, "Patient not found")
    
    query = {"_id": oid, "visits.visit_id": visit_id}
    update = {"$set": {"visits.$.dispatch_date": dispatch_date, "visits.$.tracking_id": tracking_id}}
    res = await dpms_db.patients.update_one(query, update)
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient/Visit not found")
    return {"ok": True}

# ── DPMS Medicines ─────────
@api_router.get("/medicines")
async def get_medicines(authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    meds = []
    async for m in dpms_db.medicines.find():
        m["_id"] = str(m["_id"])
        meds.append(m)
    return meds

@api_router.post("/medicines")
async def create_medicine(payload: MedicineCreate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    data = payload.model_dump()
    res = await dpms_db.medicines.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return data

@api_router.put("/medicines/{mid}")
async def update_medicine(mid: str, payload: MedicineUpdate, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(mid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    data = payload.model_dump(exclude_unset=True)
    if data:
        await dpms_db.medicines.update_one({"_id": oid}, {"$set": data})
    return {"ok": True}

@api_router.delete("/medicines/{mid}")
async def delete_medicine(mid: str, authorization: Optional[str] = Header(default=None)):
    _verify_jwt(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(mid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    res = await dpms_db.medicines.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"ok": True}

# ── Admin appointment routes ──────────────────
def _verify_admin(token: Optional[str]):
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@api_router.get("/admin/appointments", response_model=List[Appointment])
async def list_appointments(x_admin_token: Optional[str] = Header(default=None)):
    _verify_admin(x_admin_token)
    docs = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.patch("/admin/appointments/{appt_id}", response_model=Appointment)
async def update_appointment_status(
    appt_id: str,
    body: AppointmentStatusUpdate,
    x_admin_token: Optional[str] = Header(default=None),
):
    _verify_admin(x_admin_token)
    if body.status not in {"new", "contacted", "confirmed", "done", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.appointments.find_one_and_update(
        {"id": appt_id},
        {"$set": {"status": body.status}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return result


@api_router.delete("/admin/appointments/{appt_id}")
async def delete_appointment(appt_id: str, x_admin_token: Optional[str] = Header(default=None)):
    _verify_admin(x_admin_token)
    result = await db.appointments.delete_one({"id": appt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}


@api_router.post("/admin/verify")
async def verify_admin_token(x_admin_token: Optional[str] = Header(default=None)):
    _verify_admin(x_admin_token)
    return {"ok": True}


# ─────────────────────────────────────────────
#  APP SETUP — middleware + scheduler
# ─────────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup():
    # Run reminder job daily at 9:00 AM server time
    scheduler.add_job(daily_reminder_job, "cron", hour=9, minute=0)
    scheduler.start()
    logger.info("APScheduler started — daily reminder job scheduled at 09:00")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown(wait=False)
    client.close()
