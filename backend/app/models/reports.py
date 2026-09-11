from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import DispatchChannel


class ReportDispatchLog(Base):
    __tablename__ = "report_dispatch_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    official_id: Mapped[int] = mapped_column(ForeignKey("officials.id", ondelete="CASCADE"))
    channel: Mapped[DispatchChannel] = mapped_column(Enum(DispatchChannel), nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    ratings_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
