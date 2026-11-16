import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).parent.parent
load_dotenv(BACKEND_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dermacare_db')        # website bookings + user accounts
DPMS_DB_NAME = os.environ.get('DPMS_DB_NAME', 'dpms')     # clinic data: patients, appointments, medicines

# No default: a secret written in the code is public, and anyone holding it can forge logins.
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Add it to backend/.env")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_HOURS = 24

SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER     = os.environ.get("SMTP_USER", "")
# Gmail shows app passwords in groups of four ("abcd efgh ..."); the spaces aren't part of it.
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").replace(" ", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "DermaCare")

# Public booking limits. Each booking can send an email, so this protects the
# clinic's mail account from being used for spam.
BOOKINGS_PER_IP_PER_HOUR   = 5
BOOKINGS_PER_EMAIL_PER_DAY = 5
