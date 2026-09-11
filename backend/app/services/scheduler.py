import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.enums import DispatchChannel, ReportFrequency, TargetType
from app.models.officials import Official
from app.models.ratings import Rating
from app.models.reports import ReportDispatchLog
from app.services.email_service import send_email
from app.services.rag import summarize_feedback
from app.services.sms_gateway import send_sms

logger = logging.getLogger(__name__)

_FREQUENCY_INTERVAL = {
    ReportFrequency.DAILY: timedelta(days=1),
    ReportFrequency.WEEKLY: timedelta(weeks=1),
    ReportFrequency.MONTHLY: timedelta(days=30),
    ReportFrequency.QUARTERLY: timedelta(days=91),
}


def _is_due(official: Official, now: datetime) -> bool:
    interval = _FREQUENCY_INTERVAL[official.report_frequency]
    if official.last_report_sent_at is None:
        return True
    last_sent = official.last_report_sent_at
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)
    return now - last_sent >= interval


def dispatch_official_reports() -> None:
    """Aggregate recent ratings/comments per official, ask the LLM for a summary, and send it
    to the official by email/SMS based on the admin-configured dispatch frequency."""
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        officials = db.scalars(select(Official)).all()
        for official in officials:
            if not _is_due(official, now):
                continue

            since = official.last_report_sent_at or (now - _FREQUENCY_INTERVAL[official.report_frequency])
            ratings = db.scalars(
                select(Rating)
                .where(Rating.target_type == TargetType.OFFICIAL)
                .where(Rating.target_id == official.id)
                .where(Rating.created_at >= since)
            ).all()

            rating_dicts = [{"stars": r.stars, "comment": r.comment} for r in ratings]
            summary = summarize_feedback(official.name, rating_dicts)

            if official.contact_email:
                send_email(
                    official.contact_email,
                    f"Chunga Gava citizen feedback summary - {official.name}",
                    summary,
                )
                db.add(
                    ReportDispatchLog(
                        official_id=official.id,
                        channel=DispatchChannel.EMAIL,
                        summary_text=summary,
                        ratings_count=len(ratings),
                    )
                )
            if official.contact_phone:
                send_sms(official.contact_phone, summary[:400])
                db.add(
                    ReportDispatchLog(
                        official_id=official.id,
                        channel=DispatchChannel.SMS,
                        summary_text=summary,
                        ratings_count=len(ratings),
                    )
                )

            official.last_report_sent_at = now
            db.commit()
            logger.info("Dispatched feedback summary for official %s", official.name)
    finally:
        db.close()


_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="UTC")
    # Check hourly; each official is only dispatched once its configured cycle elapses.
    _scheduler.add_job(dispatch_official_reports, "interval", hours=1, id="dispatch_official_reports")
    _scheduler.start()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
