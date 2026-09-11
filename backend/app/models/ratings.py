from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, SmallInteger, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import TargetType


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        # An official's "overall" rating (manifesto_item_id IS NULL) and a rating on one of
        # their specific manifesto items are distinct vote targets and must be independently
        # one-per-voter-per-cycle - a single plain (target_type, target_id, voter_id, cycle_key)
        # constraint would wrongly conflate all of an official's manifesto items together with
        # their overall score (target_id is the official's id in both cases).
        Index(
            "uq_rating_overall_per_cycle",
            "target_type",
            "target_id",
            "voter_id",
            "cycle_key",
            unique=True,
            postgresql_where=text("manifesto_item_id IS NULL"),
        ),
        Index(
            "uq_rating_manifesto_per_cycle",
            "target_type",
            "target_id",
            "voter_id",
            "cycle_key",
            "manifesto_item_id",
            unique=True,
            postgresql_where=text("manifesto_item_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_type: Mapped[TargetType] = mapped_column(Enum(TargetType), nullable=False)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    manifesto_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("manifesto_items.id", ondelete="SET NULL"), nullable=True
    )
    voter_id: Mapped[str] = mapped_column(String(64), nullable=False)
    cycle_key: Mapped[str] = mapped_column(String(20), nullable=False)
    stars: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Marks seeded/mock demo ratings so they can be bulk-purged before a production launch.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
