from datetime import datetime, timedelta, timezone

from app.models.enums import ReportFrequency


def current_cycle_key(frequency: ReportFrequency, now: datetime | None = None) -> str:
    """Return a stable bucket identifier for the current reporting/voting cycle."""
    now = now or datetime.now(timezone.utc)
    if frequency == ReportFrequency.DAILY:
        return now.strftime("%Y-%m-%d")
    if frequency == ReportFrequency.WEEKLY:
        iso = now.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    if frequency == ReportFrequency.QUARTERLY:
        quarter = (now.month - 1) // 3 + 1
        return f"{now.year}-Q{quarter}"
    # monthly default
    return now.strftime("%Y-%m")


def current_week_epoch_start(now: datetime | None = None) -> datetime:
    """Start (00:00:00 UTC on the most recent Monday) of the weekly voting epoch containing
    `now`. Kept as the WEEKLY case of `current_epoch_start` for callers that don't need to
    vary by frequency."""
    now = now or datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def current_epoch_start(frequency: ReportFrequency, now: datetime | None = None) -> datetime:
    """Start of the current reporting/voting epoch for `frequency`, aligned with the results
    dispatch schedule (e.g. an official's configured report_frequency) rather than a single
    blanket window - a daily-reported official's vote block should lift daily, a quarterly one
    only quarterly, etc. A vote/rating `created_at` at or after this boundary is "this epoch";
    anything earlier is expired and no longer blocks a re-vote."""
    now = now or datetime.now(timezone.utc)
    if frequency == ReportFrequency.DAILY:
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if frequency == ReportFrequency.WEEKLY:
        return current_week_epoch_start(now)
    if frequency == ReportFrequency.QUARTERLY:
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        return now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    # monthly default
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
