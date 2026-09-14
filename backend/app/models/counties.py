from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class County(Base):
    """Kenyan county reference data for the header's location filter: a display emoji plus
    the coordinates the map pans/zooms to when it's selected."""

    __tablename__ = "counties"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    emoji: Mapped[str] = mapped_column(String(16), default="📍")
    # Short subtitle shown beneath the county name in the location dropdown's list (TASK.md line 744).
    tagline: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
