from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.service_classes import ServiceClass
from app.schemas.service_classes import ServiceClassCreate, ServiceClassOut, ServiceClassUpdate

router = APIRouter(tags=["service-classes"])


@router.get("/api/service-classes", response_model=list[ServiceClassOut])
def list_service_classes(db: Session = Depends(get_db)):
    return db.query(ServiceClass).order_by(ServiceClass.name).all()


@router.post("/api/admin/service-classes", response_model=ServiceClassOut)
def create_service_class(
    payload: ServiceClassCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    service_class = ServiceClass(name=payload.name, color=payload.color)
    db.add(service_class)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A service class with this name already exists") from exc
    db.refresh(service_class)
    return service_class


@router.put("/api/admin/service-classes/{class_id}", response_model=ServiceClassOut)
def update_service_class(
    class_id: int,
    payload: ServiceClassUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    service_class = db.query(ServiceClass).filter(ServiceClass.id == class_id).first()
    if not service_class:
        raise HTTPException(status_code=404, detail="Service class not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service_class, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A service class with this name already exists") from exc
    db.refresh(service_class)
    return service_class


@router.delete("/api/admin/service-classes/{class_id}", status_code=204)
def delete_service_class(class_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    service_class = db.query(ServiceClass).filter(ServiceClass.id == class_id).first()
    if not service_class:
        raise HTTPException(status_code=404, detail="Service class not found")
    db.delete(service_class)
    db.commit()
