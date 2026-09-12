from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.votes import ActiveVoteOut
from app.services.votes import list_active_votes

router = APIRouter(tags=["votes"])


@router.get("/api/votes/mine", response_model=list[ActiveVoteOut])
def get_my_active_votes(fingerprint_hash: str, db: Session = Depends(get_db)):
    """Bulk anti-bias gate warm-up: every (rating_type, target_id) this fingerprint has an
    active (unexpired) vote for right now, so the frontend can cache it once at app boot
    instead of round-tripping per leader card open."""
    return list_active_votes(db, fingerprint_hash)
