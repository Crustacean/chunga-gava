import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.info("[EMAIL-DEV] to=%s subject=%s body=%s", to_address, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
