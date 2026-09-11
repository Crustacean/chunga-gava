from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import require_admin
from app.db.session import get_db
from app.models.amenities import Amenity
from app.models.enums import TargetType
from app.models.ratings import Rating
from app.schemas.amenities import AmenityCreate, AmenityOut
from app.services.rag import summarize_feedback
from app.utils.geo import lat_lng_from_point, point_from_lat_lng

router = APIRouter(tags=["amenities"])


def _validate_kenya_bounds(lat: float, lng: float) -> None:
    settings = get_settings()
    if not (settings.geofence_min_lat <= lat <= settings.geofence_max_lat) or not (
        settings.geofence_min_lng <= lng <= settings.geofence_max_lng
    ):
        raise HTTPException(status_code=400, detail=f"Coordinates must be within {settings.geofence_country}")


def _to_out(amenity: Amenity, ai_summary: str | None = None) -> AmenityOut:
    lat, lng = lat_lng_from_point(amenity.location)
    return AmenityOut(
        id=amenity.id,
        name=amenity.name,
        category=amenity.category,
        access_requirements=amenity.access_requirements,
        county=amenity.county,
        lat=lat,
        lng=lng,
        ai_summary=ai_summary,
    )


@router.get("/api/amenities", response_model=list[AmenityOut])
def list_amenities(db: Session = Depends(get_db)):
    amenities = db.query(Amenity).all()
    return [_to_out(a) for a in amenities]


@router.get("/api/amenities/{amenity_id}", response_model=AmenityOut)
def get_amenity(amenity_id: int, db: Session = Depends(get_db)):
    amenity = db.query(Amenity).filter(Amenity.id == amenity_id).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")

    ratings = (
        db.query(Rating)
        .filter(Rating.target_type == TargetType.AMENITY, Rating.target_id == amenity_id)
        .all()
    )
    rating_dicts = [{"stars": r.stars, "comment": r.comment} for r in ratings]
    ai_summary = summarize_feedback(amenity.name, rating_dicts)
    return _to_out(amenity, ai_summary=ai_summary)


@router.post("/api/admin/amenities", response_model=AmenityOut)
def create_amenity(payload: AmenityCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    _validate_kenya_bounds(payload.lat, payload.lng)
    amenity = Amenity(
        name=payload.name,
        category=payload.category,
        access_requirements=payload.access_requirements,
        county=payload.county,
        location=point_from_lat_lng(payload.lat, payload.lng),
    )
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return _to_out(amenity)


@router.delete("/api/admin/amenities/{amenity_id}", status_code=204)
def delete_amenity(amenity_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    amenity = db.query(Amenity).filter(Amenity.id == amenity_id).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")
    db.delete(amenity)
    db.commit()
