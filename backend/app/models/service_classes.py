from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ServiceClass(Base):
    """Admin-configurable public-service category (e.g. School, Police Station) with a
    display color. Amenity.category stores the matching name, so changing a class's color
    here immediately changes every pin that references it - no per-amenity data to update."""

    __tablename__ = "service_classes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
