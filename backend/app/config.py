import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR / 'backend' / '.env') # Also load backend .env if any

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dermacare_db')

# No default: a secret written in the code is public, and anyone holding it can forge logins.
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Add it to backend/.env")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_HOURS = 24

# Code a new doctor must enter to create an account. If unset, sign-up is closed.
SIGNUP_CODE = os.environ.get("SIGNUP_CODE", "")

SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").replace(" ", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "DermaCare")

MSG91_AUTHKEY = os.environ.get("MSG91_AUTHKEY", "")
MSG91_SENDER  = os.environ.get("MSG91_SENDER", "CLINIC")
MSG91_COUNTRY = os.environ.get("MSG91_COUNTRY", "91")
