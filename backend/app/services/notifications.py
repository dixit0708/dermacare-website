import html
from datetime import datetime

from app.services.email import send_email


def _friendly_date(value: str) -> str:
    """"2026-12-01" or an ISO datetime -> "01 Dec 2026"; anything unparseable is shown as given."""
    if not value or value == "Pending":
        return "To be confirmed"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%d %b %Y")
    except ValueError:
        return value


async def send_booking_confirmation(email: str, name: str, phone: str, treatment: str,
                                    preferred_date: str, consultation_type: str, ref: str = ""):
    if not email:
        return

    mode = "Online Consultation" if consultation_type == "online" else "Clinic Visit"
    rows = [
        ("Name", name),
        ("Treatment", treatment),
        ("Consultation", mode),
        ("Preferred date", _friendly_date(preferred_date)),
        ("Phone", phone),
    ]
    if ref:
        rows.append(("Booking ref", ref[:8].upper()))

    # Everything from the booking form is escaped: it is typed by the public.
    e = html.escape
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
    await send_email(email, "Appointment Request Received - DermaCare", body_html, body_text)


async def send_thank_you_email(email: str, name: str, treatment: str, next_visit: str):
    if not email:
        return

    e = html.escape
    # Only a date passed in by the caller is announced. The admin panel never passes the
    # automatic 30-day default, because no doctor has confirmed it.
    next_visit_html = (
        f"<p>Your next visit is scheduled for <strong>{e(_friendly_date(next_visit))}</strong>.</p>"
        if next_visit else ""
    )
    body_html = f"""
    <div style="font-family:sans-serif;padding:20px;">
      <h2>Thank You for Visiting DermaCare</h2>
      <p>Dear {e(name)},</p>
      <p>Thank you for visiting us for your <strong>{e(treatment)}</strong> session.</p>
      {next_visit_html}
    </div>
    """
    await send_email(email, "Thank You for Visiting - DermaCare", body_html)
