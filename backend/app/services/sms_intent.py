"""Parses an incoming SMS message (plus any partial info already collected in the sender's
session) into a structured intent using an OpenAI JSON-mode call, so the SMS router can
decide whether the sender is asking a question or submitting a rating, in which language,
and about which leader/service/project."""

import json
import logging

from app.core.config import get_settings
from app.services.embeddings import get_openai_client

settings = get_settings()
logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {"en", "sw", "fr", "ar", "so"}
SUPPORTED_TARGET_KINDS = {"official", "amenity", "expenditure_project"}
SUPPORTED_INTENTS = {"query", "rate", "unclear"}

SYSTEM_PROMPT = (
    "You parse incoming SMS messages sent to Chunga Gava, a Kenyan civic-transparency service. "
    "Citizens use it to ask about public leaders (governors/MCAs), public services (schools, "
    "hospitals, Huduma Centers, police stations), and public expenditure projects (roads, "
    "stadiums, initiatives), or to submit a star rating and comment about one of those. "
    "Detect the sender's language (one of en, sw, fr, ar, so; default en if unsure) and their "
    "intent. Respond with strict JSON only, matching exactly this shape: "
    '{"language": "en"|"sw"|"fr"|"ar"|"so", "intent": "query"|"rate"|"unclear", '
    '"target_kind": "official"|"amenity"|"expenditure_project"|null, "target_name": string|null, '
    '"stars": integer 1-5 or null, "comment": string|null}. '
    "target_name is the leader, service, or project name/keyword the sender mentioned (e.g. a "
    "governor's name, a county, 'Nairobi-Thika highway', 'Huduma Center'). Only fill in fields "
    "you are reasonably confident about from the new message or the prior partial info given; "
    "leave the rest null rather than guessing, and never invent a target_name that wasn't "
    "actually mentioned."
)


def _clean_str(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def parse_sms_intent(message: str, prior: dict | None = None) -> dict:
    """Returns a dict with keys: language, intent, target_kind, target_name, stars, comment.
    Falls back to a best-effort 'unclear' result (preserving prior context) on any failure."""
    fallback = {
        "language": (prior or {}).get("language", "en"),
        "intent": "unclear",
        "target_kind": None,
        "target_name": None,
        "stars": None,
        "comment": None,
    }
    if not settings.openai_api_key:
        return fallback

    user_content = (
        f"Prior partial info collected so far (JSON, may be empty): {json.dumps(prior or {})}\n"
        f"New SMS message: {message}"
    )
    try:
        completion = get_openai_client().chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(completion.choices[0].message.content or "{}")
    except Exception:
        logger.exception("SMS intent parsing failed; treating as unclear")
        return fallback

    language = parsed.get("language")
    if language not in SUPPORTED_LANGUAGES:
        language = fallback["language"]

    intent = parsed.get("intent")
    if intent not in SUPPORTED_INTENTS:
        intent = "unclear"

    target_kind = parsed.get("target_kind")
    if target_kind not in SUPPORTED_TARGET_KINDS:
        target_kind = None

    stars = parsed.get("stars")
    stars = stars if isinstance(stars, int) and 1 <= stars <= 5 else None

    return {
        "language": language,
        "intent": intent,
        "target_kind": target_kind,
        "target_name": _clean_str(parsed.get("target_name")),
        "stars": stars,
        "comment": _clean_str(parsed.get("comment")),
    }
