import html
from datetime import datetime

from app.services.email import send_email_raw
from app.services.sms import send_sms_raw


def _fmt_date(dt_str: str) -> str:
    if not dt_str or dt_str == "Pending":
        return "To be confirmed"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return dt_str


async def send_booking_notifications(phone: str, email: str, name: str, treatment: str, preferred_date: str, ctype: str, ref: str = ""):
    friendly_date = _fmt_date(preferred_date)
    mode = "Online Consultation" if ctype == "online" else "Clinic Visit"

    sms_msg = f"Dear {name}, your {treatment} appointment ({mode}) request for {friendly_date} has been received. DermaCare will confirm shortly."
    await send_sms_raw(phone, sms_msg)

    if not email:
        return

    e = html.escape
    rows = [
        ("Name", name),
        ("Treatment", treatment),
        ("Consultation", mode),
        ("Preferred date", friendly_date),
        ("Phone", phone),
    ]
    if ref:
        rows.append(("Booking ref", ref[:8].upper()))
    rows_html = "".join(
        f'<tr><td style="padding:6px 12px 6px 0;color:#64748b;">{label}</td>'
        f'<td style="padding:6px 0;font-weight:600;color:#0f172a;">{e(str(value))}</td></tr>'
        for label, value in rows
    )

    body_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="color:#047857;margin:0 0 16px;">Appointment Request Received</h2>
      <p>Dear {e(name)},</p>
      <p>Thank you for booking with DermaCare. We have received your appointment request with the details below.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:14px;">{rows_html}</table>
      <p>Our team will contact you shortly to confirm the exact time.</p>
      <p>If you need to change anything, just reply to this email.</p>
      <p style="margin-top:24px;">Regards,<br>DermaCare Team</p>
    </div>
    """

    body_text = (
        f"Dear {name},\n\n"
        "Thank you for booking with DermaCare. We have received your appointment request:\n\n"
        + "\n".join(f"{label}: {value}" for label, value in rows)
        + "\n\nOur team will contact you shortly to confirm the exact time.\n"
        "If you need to change anything, just reply to this email.\n\n"
        "Regards,\nDermaCare Team\n"
    )

    await send_email_raw(email, "Appointment Request Received - DermaCare", body_html, body_text)


async def send_post_visit_notifications(phone: str, email: str, name: str, treatment: str, next_visit: str):
    friendly_date = _fmt_date(next_visit) if next_visit else ""

    sms_msg = f"Dear {name}, thank you for visiting DermaCare for your {treatment} session."
    if friendly_date:
        sms_msg += f" Your next visit is scheduled for {friendly_date}."
    await send_sms_raw(phone, sms_msg)

    e = html.escape
    next_visit_html = f"<p>Your next visit is scheduled for <strong>{e(friendly_date)}</strong>.</p>" if friendly_date else ""
    body_html = f"""
    <div style="font-family:sans-serif;padding:20px;">
      <h2>Thank You for Visiting DermaCare</h2>
      <p>Dear {e(name)},</p>
      <p>Thank you for visiting us for your <strong>{e(treatment)}</strong> session.</p>
      {next_visit_html}
    </div>
    """
    await send_email_raw(email, "Thank You for Visiting - DermaCare", body_html)
