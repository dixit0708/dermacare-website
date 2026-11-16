import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME

logger = logging.getLogger(__name__)


def _send_smtp(to_email: str, subject: str, html_body: str, text_body: str):
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((SMTP_FROM_NAME, SMTP_USER))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Reply-To"] = SMTP_USER
    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()
    if SMTP_PORT == 465:  # implicit TLS
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=20) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    else:  # any other port (usually 587): plain connection upgraded with STARTTLS
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)


def mask_email(address: str) -> str:
    """Patient addresses are personal data, so logs only show enough to tell them apart."""
    local, _, domain = address.partition("@")
    return f"{local[:1]}***@{domain}" if domain else "***"


async def send_email(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Send one email. Runs as a background task, so failures are logged, not raised."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("Email skipped: SMTP_USER / SMTP_PASSWORD not set in backend/.env")
        return
    if not to_email:
        logger.info("Email skipped: no recipient address")
        return
    try:
        # smtplib is blocking, so run it off the event loop
        await asyncio.to_thread(_send_smtp, to_email, subject, html_body, text_body)
        logger.info("Email sent to %s: %s", mask_email(to_email), subject)
    except Exception as e:
        # Only the exception type: SMTP error text can echo the recipient address.
        logger.error("Email to %s failed: %s", mask_email(to_email), type(e).__name__)
