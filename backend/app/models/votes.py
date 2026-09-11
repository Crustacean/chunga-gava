from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Vote(Base):
    """Fingerprint-based anti-double-voting record, independent of the richer `ratings` table:
    one row per (fingerprint_hash, target_id, rating_type) per active weekly epoch. A device
    fingerprint survives clearing localStorage, so it's a much harder-to-evade duplicate-vote
    signal than the existing `Rating.voter_id`."""

    __tablename__ = "votes"
    __table_args__ = (
        Index("ix_votes_lookup", "fingerprint_hash", "target_id", "rating_type", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    fingerprint_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[int] = mapped_column(nullable=False)
    # "official" | "amenity" | "expenditure_project" | "manifesto"
    rating_type: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
