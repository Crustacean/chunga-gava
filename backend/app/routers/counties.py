from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.counties import County
from app.schemas.counties import CountyCreate, CountyOut, CountyUpdate

router = APIRouter(tags=["counties"])


@router.get("/api/counties", response_model=list[CountyOut])
def list_counties(db: Session = Depends(get_db)):
    return db.query(County).order_by(County.name).all()


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
