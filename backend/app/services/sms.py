import httpx
import logging
from app.config import MSG91_AUTHKEY, MSG91_SENDER, MSG91_COUNTRY

logger = logging.getLogger(__name__)

def _normalise_phone(phone: str) -> str:
    clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not clean.startswith(MSG91_COUNTRY):
        clean = MSG91_COUNTRY + clean
    return clean

async def send_sms_raw(phone: str, message: str):
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
            logger.info(f"SMS sent to {clean}: {resp.text}")
    except Exception as e:
        logger.error(f"SMS to {clean} failed: {str(e)}")
