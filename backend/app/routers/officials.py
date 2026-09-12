from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import require_admin
from app.db.session import get_db
from app.models.enums import OfficialRole, TargetType
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import ManifestoItem, Official
from app.models.ratings import Rating
from app.schemas.officials import (
    ManifestoItemOut,
    OfficialCreate,
    OfficialInsightsOut,
    OfficialOut,
    OfficialUpdate,
    PeerOfficialOut,
    VoteStatusOut,
)
from app.services.rag import summarize_feedback
from app.services.votes import has_voted
from app.utils.geo import lat_lng_from_point, point_from_lat_lng

router = APIRouter(tags=["officials"])


def _to_out(official: Official) -> OfficialOut:
    lat, lng = lat_lng_from_point(official.location)
    return OfficialOut(
        id=official.id,
        name=official.name,
        role=official.role,
        county=official.county,
        ward=official.ward,
        photo_url=official.photo_url,
        lat=lat,
        lng=lng,
        report_frequency=official.report_frequency,
        manifesto_items=[
            ManifestoItemOut(id=i.id, title=i.title, description=i.description) for i in official.manifesto_items
        ],
    )


def _approval_pct(db: Session, official_id: int) -> float:
    """Share of an official's overall (non-manifesto-specific) ratings that are >=4 stars;
    0.0 if they have no ratings yet. Shared by the insights endpoint and the peer-benchmark
    calculations below so "approval" always means the same thing everywhere."""
    ratings = (
        db.query(Rating.stars)
        .filter(
            Rating.target_type == TargetType.OFFICIAL,
            Rating.target_id == official_id,
            Rating.manifesto_item_id.is_(None),
        )
        .all()
    )
    if not ratings:
        return 0.0
    approve = sum(1 for (stars,) in ratings if stars >= 4)
    return approve / len(ratings) * 100


def _validate_kenya_bounds(lat: float, lng: float) -> None:
    settings = get_settings()
    if not (settings.geofence_min_lat <= lat <= settings.geofence_max_lat) or not (
        settings.geofence_min_lng <= lng <= settings.geofence_max_lng
    ):
        raise HTTPException(status_code=400, detail=f"Coordinates must be within {settings.geofence_country}")


@router.get("/api/officials", response_model=list[OfficialOut])
def list_officials(db: Session = Depends(get_db)):
    officials = db.query(Official).options(selectinload(Official.manifesto_items)).all()
    return [_to_out(o) for o in officials]


@router.get("/api/officials/{official_id}", response_model=OfficialOut)
def get_official(official_id: int, db: Session = Depends(get_db)):
    official = (
        db.query(Official)
        .options(selectinload(Official.manifesto_items))
        .filter(Official.id == official_id)
        .first()
    )
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")
    return _to_out(official)


@router.get("/api/officials/{official_id}/vote-status", response_model=VoteStatusOut)
def get_official_vote_status(official_id: int, fingerprint_hash: str, db: Session = Depends(get_db)):
    """Read-only check backing the leader pop-up's anti-bias rating gate: whether this
    fingerprint has already cast an "overall" vote for this official this epoch."""
    official = db.query(Official).filter(Official.id == official_id).first()
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")
    voted = has_voted(db, fingerprint_hash, official_id, "official", official.report_frequency)
    return VoteStatusOut(voted=voted)


@router.get("/api/officials/{official_id}/insights", response_model=OfficialInsightsOut)
def get_official_insights(official_id: int, db: Session = Depends(get_db)):
    """Approval sentiment (from overall, non-manifesto-specific ratings) + AI summary + the
    official's county-wide public-expenditure budget picture + peer-benchmark data, shown
    once a citizen has voted."""
    official = db.query(Official).filter(Official.id == official_id).first()
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")

    ratings = (
        db.query(Rating)
        .filter(
            Rating.target_type == TargetType.OFFICIAL,
            Rating.target_id == official_id,
            Rating.manifesto_item_id.is_(None),
        )
        .all()
    )
    total = len(ratings)
    approve = sum(1 for r in ratings if r.stars >= 4)
    disapprove = total - approve
    approval_pct = (approve / total * 100) if total else 0.0
    disapproval_pct = 100.0 - approval_pct if total else 0.0
    ai_summary = summarize_feedback(official.name, [{"stars": r.stars, "comment": r.comment} for r in ratings])

    total_allocated, total_spent = (
        db.query(
            func.coalesce(func.sum(ExpenditureProject.budget_allocated), 0.0),
            func.coalesce(func.sum(ExpenditureProject.budget_spent), 0.0),
        )
        .filter(ExpenditureProject.county == official.county)
        .first()
    )
    expenditure_pct = (total_spent / total_allocated * 100) if total_allocated else 0.0

    comparison_official = None
    if official.role == OfficialRole.MCA:
        # County MCA Rank: benchmark against this MCA's peers (other MCAs in the same county).
        peer_mcas = (
            db.query(Official)
            .filter(Official.role == OfficialRole.MCA, Official.county == official.county, Official.id != official_id)
            .all()
        )
        peer_pcts = [_approval_pct(db, peer.id) for peer in peer_mcas]
        benchmark_label = "County MCAs"
        benchmark_approval_pct = sum(peer_pcts) / len(peer_pcts) if peer_pcts else 0.0

        governor = (
            db.query(Official)
            .filter(Official.role == OfficialRole.GOVERNOR, Official.county == official.county)
            .first()
        )
        if governor:
            comparison_official = PeerOfficialOut(
                id=governor.id,
                name=governor.name,
                photo_url=governor.photo_url,
                approval_pct=_approval_pct(db, governor.id),
            )
    else:
        # Countrywide Rank: benchmark against the national average of all other Governors.
        peer_governors = (
            db.query(Official).filter(Official.role == OfficialRole.GOVERNOR, Official.id != official_id).all()
        )
        peer_pcts = [_approval_pct(db, peer.id) for peer in peer_governors]
        benchmark_label = "Countrywide"
        benchmark_approval_pct = sum(peer_pcts) / len(peer_pcts) if peer_pcts else 0.0

    return OfficialInsightsOut(
        ai_summary=ai_summary,
        approval_pct=approval_pct,
        disapproval_pct=disapproval_pct,
        approval_count=approve,
        disapproval_count=disapprove,
        total_ratings=total,
        county_budget_allocated=total_allocated,
        county_budget_spent=total_spent,
        county_expenditure_pct=expenditure_pct,
        benchmark_label=benchmark_label,
        benchmark_approval_pct=benchmark_approval_pct,
        comparison_official=comparison_official,
    )


@router.post("/api/admin/officials", response_model=OfficialOut)
def create_official(
    payload: OfficialCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    _validate_kenya_bounds(payload.lat, payload.lng)
    official = Official(
        name=payload.name,
        role=payload.role,
        county=payload.county,
        ward=payload.ward,
        photo_url=payload.photo_url,
        location=point_from_lat_lng(payload.lat, payload.lng),
        report_frequency=payload.report_frequency,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
    )
    official.manifesto_items = [
        ManifestoItem(title=item.title, description=item.description) for item in payload.manifesto_items
    ]
    db.add(official)
    db.commit()
    db.refresh(official)
    return _to_out(official)


@router.put("/api/admin/officials/{official_id}", response_model=OfficialOut)
def update_official(
    official_id: int,
    payload: OfficialUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    official = db.query(Official).filter(Official.id == official_id).first()
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")

    data = payload.model_dump(exclude_unset=True)
    lat = data.pop("lat", None)
    lng = data.pop("lng", None)
    if lat is not None or lng is not None:
        current_lat, current_lng = lat_lng_from_point(official.location)
        new_lat = lat if lat is not None else current_lat
        new_lng = lng if lng is not None else current_lng
        _validate_kenya_bounds(new_lat, new_lng)
        official.location = point_from_lat_lng(new_lat, new_lng)

    for field, value in data.items():
        setattr(official, field, value)

    db.commit()
    db.refresh(official)
    return _to_out(official)


@router.delete("/api/admin/officials/{official_id}", status_code=204)
def delete_official(official_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    official = db.query(Official).filter(Official.id == official_id).first()
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")
    db.delete(official)
    db.commit()
