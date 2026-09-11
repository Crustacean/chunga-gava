from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import OfficialRole, ReportFrequency


class Official(Base):
    __tablename__ = "officials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[OfficialRole] = mapped_column(Enum(OfficialRole), nullable=False)
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    report_frequency: Mapped[ReportFrequency] = mapped_column(
        Enum(ReportFrequency), default=ReportFrequency.MONTHLY
    )
    last_report_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Marks seeded/mock demo records so they can be bulk-purged before a production launch.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manifesto_items: Mapped[list["ManifestoItem"]] = relationship(
        back_populates="official", cascade="all, delete-orphan"
    )


class ManifestoItem(Base):
    __tablename__ = "manifesto_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    official_id: Mapped[int] = mapped_column(ForeignKey("officials.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    official: Mapped[Official] = relationship(back_populates="manifesto_items")
