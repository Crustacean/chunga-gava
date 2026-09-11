import logging

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_at_sms = None


def _get_africastalking_sms():
    global _at_sms
    if _at_sms is None:
        import africastalking

        africastalking.initialize(settings.at_username, settings.at_api_key)
        _at_sms = africastalking.SMS
    return _at_sms


def send_sms(phone_number: str, message: str) -> None:
    """Send an SMS via Africa's Talking. Falls back to logging when no API key is configured
    (e.g. local development), so the rest of the flow can still be exercised end-to-end.
    Any gateway-side failure (bad credentials, rejected number, outage) is logged rather than
    raised, so a single failed outbound SMS never crashes the caller (e.g. the incoming SMS
    webhook, which must keep responding to the gateway regardless)."""
    if not settings.at_api_key:
        logger.info("[SMS-DEV] to=%s message=%s", phone_number, message)
        return

    try:
        sms = _get_africastalking_sms()
        kwargs = {}
        if settings.at_sender_id:
            kwargs["sender_id"] = settings.at_sender_id
        sms.send(message, [phone_number], **kwargs)
    except Exception:
        logger.exception("Failed to send SMS to %s via Africa's Talking", phone_number)
