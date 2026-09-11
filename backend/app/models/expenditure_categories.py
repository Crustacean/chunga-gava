from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExpenditureCategory(Base):
    """Legend/filter category for public-expenditure projects (e.g. Roads, Schools),
    mirroring ServiceClass so the map legend filtering pattern can be reused as-is."""

    __tablename__ = "expenditure_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
