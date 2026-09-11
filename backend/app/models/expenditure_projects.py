from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import ExpenditureStatus


class ExpenditureProject(Base):
    """A public infrastructure/spending record (road, school, hospital, stadium,
    initiative, ...) shown on the 'Public Expenditure' map layer."""

    __tablename__ = "expenditure_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    county: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    # Free-form single spec (e.g. label="Road Length", value="42 km") - covers the wide
    # variety of project types without needing a rigid per-category schema.
    spec_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    spec_value: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_allocated: Mapped[float] = mapped_column(Float, default=0)
    budget_spent: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[ExpenditureStatus] = mapped_column(Enum(ExpenditureStatus), default=ExpenditureStatus.PLANNED)
    # List of {"date": "YYYY-MM-DD", "milestone": "started"|"stalled"|"resumed"|"finished", "note": str}
    milestones: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # Marks seeded/mock demo records so they can be bulk-purged before a production launch.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
