import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import db
from app.services.sms import send_sms_raw

logger = logging.getLogger(__name__)

def _fmt_date(dt_str: str) -> str:
    if not dt_str or dt_str == "Pending":
        return "To be confirmed"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return dt_str

async def _send_daily_reminders():
    logger.info("Running daily SMS reminders...")
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    tomorrow_start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)

    cursor = db.appointments.find({
        "status": "confirmed",
        "date_time": {
            "": tomorrow_start.isoformat(),
            "": tomorrow_end.isoformat()
        }
    })
    count = 0
    async for appt in cursor:
        phone = appt.get("phone")
        name = appt.get("full_name")
        dt_str = appt.get("date_time")
        if phone and name and dt_str:
            friendly_date = _fmt_date(dt_str)
            msg = f"Reminder: Dear {name}, you have an appointment with DermaCare tomorrow ({friendly_date})."
            await send_sms_raw(phone, msg)
            count += 1
    logger.info(f"Sent {count} reminders.")

def setup_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_send_daily_reminders, 'cron', hour=9, minute=0)
    scheduler.start()
    return scheduler
