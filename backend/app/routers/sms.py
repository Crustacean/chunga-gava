"""SMS gateway webhook: lets citizens on budget phones query public leaders/services/
expenditure projects and submit star ratings entirely over SMS, in their own language.

Multi-turn flow: if a message is missing something required (e.g. a rating with no target
or no star count), the sender's phone number is used as a session key so the next SMS can
fill in the gap without repeating everything.
"""

import difflib
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.amenities import Amenity
from app.models.enums import ReportFrequency, TargetType
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import Official
from app.models.ratings import Rating
from app.services.rag import answer_question, translate_short
from app.services.sms_gateway import send_sms
from app.services.sms_intent import parse_sms_intent
from app.services.sms_sessions import clear_session, get_session, set_session
from app.utils.cycles import current_cycle_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sms"])
settings = get_settings()

SMS_REPLY_LIMIT = 320
DEFAULT_CYCLE_FREQUENCY = ReportFrequency.MONTHLY

TARGET_KIND_TO_TYPE = {
    "official": TargetType.OFFICIAL,
    "amenity": TargetType.AMENITY,
    "expenditure_project": TargetType.EXPENDITURE_PROJECT,
}

MISSING_TARGET_PROMPT = {
    "en": "Which leader, service, or project is this about? Please reply with its name.",
    "sw": "Hii inahusu kiongozi, huduma, au mradi upi? Tafadhali jibu ukitaja jina lake.",
    "fr": "De quel dirigeant, service ou projet s'agit-il ? Merci de répondre avec son nom.",
    "ar": "عن أي قائد أو خدمة أو مشروع يدور الحديث؟ يرجى الرد باسمه.",
    "so": "Kee hoggaamiye, adeeg, ama mashruuc ayaad ka hadlaysaa? Fadlan ku jawaab magaciisa.",
}
MISSING_STARS_PROMPT = {
    "en": "How many stars (1-5) would you like to give?",
    "sw": "Ungependa kutoa nyota ngapi (1-5)?",
    "fr": "Combien d'étoiles (1 à 5) souhaitez-vous donner ?",
    "ar": "كم عدد النجوم (1-5) التي ترغب في منحها؟",
    "so": "Immisa xiddigood (1-5) ayaad rabtaa inaad siiso?",
}
NOT_FOUND_PROMPT = {
    "en": 'Sorry, no match found for "{name}". Please try a more specific name.',
    "sw": 'Samahani, hakuna kilicholingana na "{name}". Tafadhali jaribu jina mahususi zaidi.',
    "fr": 'Désolé, aucune correspondance trouvée pour « {name} ». Essayez un nom plus précis.',
    "ar": 'عذرًا، لم يتم العثور على تطابق لـ "{name}". حاول اسمًا أكثر تحديدًا.',
    "so": 'Waan ka xumahay, lama helin wax la mid ah "{name}". Fadlan isku day magac saxda ah.',
}
RATING_SAVED_PROMPT = {
    "en": "Thanks! Your {stars}-star rating for {name} was recorded.",
    "sw": "Asante! Ukadiriaji wako wa nyota {stars} kwa {name} umerekodiwa.",
    "fr": "Merci ! Votre note de {stars} étoiles pour {name} a été enregistrée.",
    "ar": "شكرًا! تم تسجيل تقييمك بـ {stars} نجوم لـ {name}.",
    "so": "Mahadsanid! Qiimeyntaada {stars} xiddigood ee {name} waa la duubay.",
}
ALREADY_RATED_PROMPT = {
    "en": "You've already rated {name} this cycle. Thanks for your feedback!",
    "sw": "Tayari umekadiria {name} kwa kipindi hiki. Asante kwa maoni yako!",
    "fr": "Vous avez déjà noté {name} pour ce cycle. Merci pour votre retour !",
    "ar": "لقد قيّمت {name} بالفعل خلال هذه الدورة. شكرًا لملاحظاتك!",
    "so": "Horaad ayaad u qiimeysay {name} wareeggan. Mahadsanid falanqaynta aad bixisay!",
}


async def _extract_sender_and_text(request: Request) -> tuple[str, str]:
    """Support both Africa's Talking (`from`/`text`) and Twilio-style (`From`/`Body`) webhook payloads."""
    form = await request.form()
    sender = form.get("from") or form.get("From") or ""
    text = form.get("text") or form.get("Body") or ""
    return str(sender), str(text)


def _webhook_authorized(request: Request) -> bool:
    if not settings.sms_webhook_secret:
        return True
    provided = request.headers.get("X-Webhook-Secret") or request.query_params.get("secret")
    return provided == settings.sms_webhook_secret


TargetRecord = Official | Amenity | ExpenditureProject


def _normalize_tokens(text: str) -> set[str]:
    return set(text.lower().replace("-", " ").replace("(", " ").replace(")", " ").split())


def _best_match(candidates: list[tuple[TargetRecord, str]], name: str, cutoff: float = 0.3) -> TargetRecord | None:
    """Fuzzy-matches an AI-extracted name against candidate labels: an LLM's extracted phrase
    (e.g. 'Nairobi Thika highway') rarely substring-matches a DB record verbatim (e.g.
    'Nairobi-Thika Superhighway Rehabilitation'), so this scores on word-overlap and sequence
    similarity rather than requiring an exact substring."""
    if not candidates or not name:
        return None
    name_lower = name.lower().strip()
    name_tokens = _normalize_tokens(name)
    best_obj, best_score = None, 0.0
    for obj, label in candidates:
        label_lower = label.lower()
        if name_lower in label_lower or label_lower in name_lower:
            return obj
        label_tokens = _normalize_tokens(label)
        overlap = len(name_tokens & label_tokens) / max(len(name_tokens), 1)
        ratio = difflib.SequenceMatcher(None, name_lower, label_lower).ratio()
        score = max(overlap, ratio)
        if score > best_score:
            best_score, best_obj = score, obj
    return best_obj if best_score >= cutoff else None


def _find_official(db: Session, name: str) -> Official | None:
    candidates = [(o, f"{o.name} {o.county} {o.role.value}") for o in db.query(Official).all()]
    return _best_match(candidates, name)


def _find_amenity(db: Session, name: str) -> Amenity | None:
    candidates = [(a, f"{a.name} {a.category} {a.county or ''}") for a in db.query(Amenity).all()]
    return _best_match(candidates, name)


def _find_expenditure_project(db: Session, name: str) -> ExpenditureProject | None:
    candidates = [
        (p, f"{p.name} {p.category} {p.county or ''}") for p in db.query(ExpenditureProject).all()
    ]
    return _best_match(candidates, name)


def _resolve_target(db: Session, target_kind: str | None, target_name: str | None):
    if not target_kind or not target_name:
        return None
    if target_kind == "official":
        return _find_official(db, target_name)
    if target_kind == "amenity":
        return _find_amenity(db, target_name)
    if target_kind == "expenditure_project":
        return _find_expenditure_project(db, target_name)
    return None


def _describe_official(o: Official) -> str:
    contact = o.contact_phone or o.contact_email or "no contact on file"
    return f"{o.name} ({o.role.value.title()}, {o.county}). Contact: {contact}."


def _describe_amenity(a: Amenity) -> str:
    return f"{a.name} ({a.category}, {a.county or 'Kenya'}): {a.access_requirements}"[:SMS_REPLY_LIMIT]


def _describe_project(p: ExpenditureProject) -> str:
    spec = f" {p.spec_label}: {p.spec_value}." if p.spec_label and p.spec_value else ""
    return (
        f"{p.name} ({p.status.value}).{spec} Budget allocated KES {p.budget_allocated:,.0f}, "
        f"spent KES {p.budget_spent:,.0f}."
    )


def _cycle_key_for(target) -> str:
    if isinstance(target, Official):
        return current_cycle_key(target.report_frequency)
    return current_cycle_key(DEFAULT_CYCLE_FREQUENCY)


def _handle_rate(db: Session, sender: str, merged: dict, language: str) -> str:
    if not merged.get("target_kind") or not merged.get("target_name"):
        set_session(sender, merged)
        return translate_short(MISSING_TARGET_PROMPT.get(language, MISSING_TARGET_PROMPT["en"]), language)
    if not merged.get("stars"):
        set_session(sender, merged)
        return translate_short(MISSING_STARS_PROMPT.get(language, MISSING_STARS_PROMPT["en"]), language)

    target = _resolve_target(db, merged["target_kind"], merged["target_name"])
    if not target:
        clear_session(sender)
        return NOT_FOUND_PROMPT.get(language, NOT_FOUND_PROMPT["en"]).format(name=merged["target_name"])

    rating = Rating(
        target_type=TARGET_KIND_TO_TYPE[merged["target_kind"]],
        target_id=target.id,
        voter_id=f"sms:{sender}",
        cycle_key=_cycle_key_for(target),
        stars=merged["stars"],
        comment=merged.get("comment"),
    )
    db.add(rating)
    try:
        db.commit()
        clear_session(sender)
        return RATING_SAVED_PROMPT.get(language, RATING_SAVED_PROMPT["en"]).format(
            stars=merged["stars"], name=target.name
        )
    except IntegrityError:
        db.rollback()
        clear_session(sender)
        return ALREADY_RATED_PROMPT.get(language, ALREADY_RATED_PROMPT["en"]).format(name=target.name)


def _handle_query(db: Session, sender: str, merged: dict, text: str, language: str) -> str:
    clear_session(sender)
    target = _resolve_target(db, merged.get("target_kind"), merged.get("target_name"))
    if target is not None:
        if isinstance(target, Official):
            fact = _describe_official(target)
        elif isinstance(target, ExpenditureProject):
            fact = _describe_project(target)
        else:
            fact = _describe_amenity(target)
        return translate_short(fact, language)

    answer, _citations, _low_confidence = answer_question(db, text, language=language)
    return answer


@router.post("/api/sms/incoming")
@router.post("/api/sms-receive")
async def receive_sms(request: Request, db: Session = Depends(get_db)):
    if not _webhook_authorized(request):
        return PlainTextResponse("forbidden", status_code=403)

    sender, text = await _extract_sender_and_text(request)
    if not sender or not text.strip():
        return PlainTextResponse("ignored", status_code=200)
    text = text.strip()

    try:
        prior = get_session(sender) or {}
        parsed = parse_sms_intent(text, prior)
        merged = {**prior, **{k: v for k, v in parsed.items() if v not in (None, "")}}
        # A pending, still-incomplete rating takes priority over however the fresh message
        # alone gets classified - e.g. after "How many stars?", a reply of just "5" or a
        # bare project name should complete the rating, not start a brand-new query.
        prior_incomplete_rating = prior.get("intent") == "rate" and (
            not prior.get("target_kind") or not prior.get("target_name") or not prior.get("stars")
        )
        intent = "rate" if prior_incomplete_rating else merged.get("intent", "unclear")
        merged["intent"] = intent
        language = merged.get("language", "en")

        if intent == "rate":
            reply = _handle_rate(db, sender, merged, language)
        elif intent == "query":
            reply = _handle_query(db, sender, merged, text, language)
        else:
            # Unclear intent: fall back to the general knowledge-base assistant so the sender
            # still gets a useful reply instead of silence.
            clear_session(sender)
            answer, _citations, _low_confidence = answer_question(db, text, language=language)
            reply = answer
    except Exception:
        # Never let an unexpected failure surface as a 500 to the SMS gateway (which may
        # retry/alert on non-2xx); log it and clear any half-formed session instead.
        logger.exception("Failed to process incoming SMS from %s", sender)
        clear_session(sender)
        reply = "Sorry, something went wrong processing your message. Please try again shortly."

    send_sms(sender, reply[:SMS_REPLY_LIMIT])
    return PlainTextResponse("ok", status_code=200)
