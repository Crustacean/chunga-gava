"""Fingerprint-based anti-double-voting enforcement, layered on top of (and stricter than)
the existing voter_id+cycle_key check on the `ratings` table: a browser fingerprint survives
clearing localStorage/private-browsing, so it's a much harder-to-evade duplicate-vote signal.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import ReportFrequency
from app.models.officials import ManifestoItem, Official
from app.models.votes import Vote
from app.utils.cycles import current_epoch_start

FREQUENCY_PHRASE = {
    ReportFrequency.DAILY: "today",
    ReportFrequency.WEEKLY: "this week",
    ReportFrequency.MONTHLY: "this month",
    ReportFrequency.QUARTERLY: "this quarter",
}

# Amenities and expenditure projects don't have an admin-configured dispatch frequency, so
# their votes cycle monthly - mirrors AMENITY_CYCLE_FREQUENCY in routers/ratings.py.
_DEFAULT_TARGET_FREQUENCY = ReportFrequency.MONTHLY


def has_voted(
    db: Session,
    fingerprint_hash: str,
    target_id: int,
    rating_type: str,
    frequency: ReportFrequency = ReportFrequency.WEEKLY,
) -> bool:
    """Read-only check (no side effects, unlike register_vote_or_409) of whether this
    fingerprint already has a vote for this target+rating_type within the current epoch -
    used to gate analytics visibility (anti-bias rating gate) before any vote is submitted."""
    epoch_start = current_epoch_start(frequency)
    return (
        db.query(Vote)
        .filter(
            Vote.fingerprint_hash == fingerprint_hash,
            Vote.target_id == target_id,
            Vote.rating_type == rating_type,
            Vote.created_at >= epoch_start,
        )
        .first()
        is not None
    )


def register_vote_or_409(
    db: Session,
    fingerprint_hash: str,
    target_id: int,
    rating_type: str,
    label: str,
    frequency: ReportFrequency = ReportFrequency.WEEKLY,
) -> None:
    """Raises HTTPException(409) if this fingerprint already has a vote for this exact
    target+rating_type within the current epoch for `frequency` (e.g. an official reported on
    daily/weekly/monthly/quarterly cadence gets a daily/weekly/monthly/quarterly vote window,
    not a one-size-fits-all block); otherwise stages a new Vote row on `db` (added but not
    committed - the caller commits it alongside its own insert so both succeed or both roll
    back together)."""
    if has_voted(db, fingerprint_hash, target_id, rating_type, frequency):
        period = FREQUENCY_PHRASE.get(frequency, "this cycle")
        raise HTTPException(status_code=409, detail=f"You have a recorded vote for {label} {period}.")
    db.add(Vote(fingerprint_hash=fingerprint_hash, target_id=target_id, rating_type=rating_type))


def list_active_votes(db: Session, fingerprint_hash: str) -> list[Vote]:
    """All of this fingerprint's votes that are still within their own target's active epoch
    (i.e. would currently block a re-vote). Used to eagerly warm the frontend's anti-bias gate
    cache once at app boot, instead of each leader card checking vote-status on open."""
    votes = db.query(Vote).filter(Vote.fingerprint_hash == fingerprint_hash).all()
    if not votes:
        return []

    official_ids = {v.target_id for v in votes if v.rating_type == "official"}
    manifesto_ids = {v.target_id for v in votes if v.rating_type == "manifesto"}

    frequency_by_official_id: dict[int, ReportFrequency] = {}
    if official_ids:
        frequency_by_official_id = dict(
            db.query(Official.id, Official.report_frequency).filter(Official.id.in_(official_ids)).all()
        )

    frequency_by_manifesto_id: dict[int, ReportFrequency] = {}
    if manifesto_ids:
        frequency_by_manifesto_id = dict(
            db.query(ManifestoItem.id, Official.report_frequency)
            .join(Official, Official.id == ManifestoItem.official_id)
            .filter(ManifestoItem.id.in_(manifesto_ids))
            .all()
        )

    active = []
    for vote in votes:
        if vote.rating_type == "official":
            frequency = frequency_by_official_id.get(vote.target_id, ReportFrequency.WEEKLY)
        elif vote.rating_type == "manifesto":
            frequency = frequency_by_manifesto_id.get(vote.target_id, ReportFrequency.WEEKLY)
        else:
            frequency = _DEFAULT_TARGET_FREQUENCY
        if vote.created_at >= current_epoch_start(frequency):
            active.append(vote)
    return active
