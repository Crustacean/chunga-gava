from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.amenities import Amenity
from app.models.enums import ExpenditureStatus
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import ManifestoItem, Official
from app.models.counties import County
from app.models.votes import Vote
from app.schemas.counties import CountyCreate, CountyOut, CountyUpdate

router = APIRouter(tags=["counties"])


@router.get("/api/counties", response_model=list[CountyOut])
def list_counties(db: Session = Depends(get_db)):
    return db.query(County).order_by(County.name).all()


@router.get("/api/counties/quick-jump", response_model=list[CountyOut])
def quick_jump_counties(fingerprint_hash: str | None = None, db: Session = Depends(get_db)):
    """AI-suggested 'Quick Jump' chips: up to 5 counties ranked by a composite score of (a)
    this device's own past vote/rating history (personal relevance), (b) county-wide aggregate
    vote volume across all users (regional popularity), and (c) a 'news-break' bonus for
    counties with a stalled expenditure project. Client-IP geolocation is intentionally NOT
    implemented - there's no GeoIP data source in this environment, so faking it would just be
    a hardcoded no-op; remaining slots are filled deterministically (alphabetically) so the
    endpoint always returns up to 5 counties even with a sparse/fresh database.
    """
    counties = db.query(County).order_by(County.name).all()
    if not counties:
        return []

    official_county = dict(db.query(Official.id, Official.county).all())
    manifesto_official_id = dict(db.query(ManifestoItem.id, ManifestoItem.official_id).all())
    amenity_county = dict(db.query(Amenity.id, Amenity.county).all())
    project_county = dict(db.query(ExpenditureProject.id, ExpenditureProject.county).all())

    def resolve_county(rating_type: str, target_id: int) -> str | None:
        if rating_type == "official":
            return official_county.get(target_id)
        if rating_type == "manifesto":
            official_id = manifesto_official_id.get(target_id)
            return official_county.get(official_id) if official_id is not None else None
        if rating_type == "amenity":
            return amenity_county.get(target_id)
        if rating_type == "expenditure_project":
            return project_county.get(target_id)
        return None

    personal_hits: dict[str, int] = defaultdict(int)
    popularity_hits: dict[str, int] = defaultdict(int)
    votes = db.query(Vote.fingerprint_hash, Vote.rating_type, Vote.target_id).all()
    for vote_fingerprint, rating_type, target_id in votes:
        county_name = resolve_county(rating_type, target_id)
        if not county_name:
            continue
        popularity_hits[county_name] += 1
        if fingerprint_hash and vote_fingerprint == fingerprint_hash:
            personal_hits[county_name] += 1

    stalled_counties = {
        row[0]
        for row in db.query(ExpenditureProject.county)
        .filter(ExpenditureProject.status == ExpenditureStatus.STALLED, ExpenditureProject.county.isnot(None))
        .distinct()
        .all()
    }

    def score(county_name: str) -> float:
        news_bonus = 5 if county_name in stalled_counties else 0
        return personal_hits[county_name] * 3 + popularity_hits[county_name] * 1 + news_bonus

    ranked = sorted(counties, key=lambda c: (-score(c.name), c.name))
    top = [c for c in ranked if score(c.name) > 0][:5]
    if len(top) < 5:
        top_ids = {c.id for c in top}
        top.extend(c for c in ranked if c.id not in top_ids)
    return top[:5]


@router.post("/api/admin/counties", response_model=CountyOut)
def create_county(payload: CountyCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    county = County(name=payload.name, emoji=payload.emoji, lat=payload.lat, lng=payload.lng)
    db.add(county)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A county with this name already exists") from exc
    db.refresh(county)
    return county


@router.put("/api/admin/counties/{county_id}", response_model=CountyOut)
def update_county(
    county_id: int,
    payload: CountyUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    county = db.query(County).filter(County.id == county_id).first()
    if not county:
        raise HTTPException(status_code=404, detail="County not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(county, field, value)
    db.commit()
    db.refresh(county)
    return county


@router.delete("/api/admin/counties/{county_id}", status_code=204)
def delete_county(county_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    county = db.query(County).filter(County.id == county_id).first()
    if not county:
        raise HTTPException(status_code=404, detail="County not found")
    db.delete(county)
    db.commit()
