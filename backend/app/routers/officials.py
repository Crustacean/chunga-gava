from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import require_admin
from app.db.session import get_db
from app.models.officials import ManifestoItem, Official
from app.schemas.officials import ManifestoItemOut, OfficialCreate, OfficialOut, OfficialUpdate
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
