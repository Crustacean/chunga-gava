from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.reports import ReportDispatchLog
from app.services.scheduler import dispatch_official_reports

router = APIRouter(prefix="/api/admin/reports", tags=["reports"])


@router.get("/logs")
def list_dispatch_logs(db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    logs = db.query(ReportDispatchLog).order_by(ReportDispatchLog.sent_at.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "official_id": log.official_id,
            "channel": log.channel,
            "summary_text": log.summary_text,
            "ratings_count": log.ratings_count,
            "sent_at": log.sent_at,
        }
        for log in logs
    ]


@router.post("/run-now")
def run_now(_admin: str = Depends(require_admin)):
    dispatch_official_reports()
    return {"status": "dispatched"}
