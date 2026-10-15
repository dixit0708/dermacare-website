import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR / 'backend' / '.env') # Also load backend .env if any

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dermacare_db')

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "dermacare-admin-2025")
JWT_SECRET  = os.environ.get("JWT_SECRET",  "dermacare-jwt-secret-2025")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_HOURS = 24

SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").replace(" ", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "DermaCare")

MSG91_AUTHKEY = os.environ.get("MSG91_AUTHKEY", "")
MSG91_SENDER  = os.environ.get("MSG91_SENDER", "CLINIC")
MSG91_COUNTRY = os.environ.get("MSG91_COUNTRY", "91")
