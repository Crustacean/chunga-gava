from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # school, hospital, etc.
    location: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    access_requirements: Mapped[str] = mapped_column(Text, nullable=False)
    county: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Marks seeded/mock demo records so they can be bulk-purged before a production launch.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
