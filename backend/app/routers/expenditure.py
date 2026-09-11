from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import require_admin
from app.db.session import get_db
from app.models.enums import TargetType
from app.models.expenditure_categories import ExpenditureCategory
from app.models.expenditure_projects import ExpenditureProject
from app.models.ratings import Rating
from app.schemas.expenditure import (
    ExpenditureCategoryCreate,
    ExpenditureCategoryOut,
    ExpenditureCategoryUpdate,
    ExpenditureProjectCreate,
    ExpenditureProjectOut,
    ExpenditureProjectUpdate,
    ExpenditureValidationRequest,
    ExpenditureValidationResponse,
    Milestone,
)
from app.services.expenditure_validation import validate_expenditure_record
from app.services.rag import summarize_feedback
from app.utils.geo import lat_lng_from_point, point_from_lat_lng

router = APIRouter(tags=["expenditure"])


def _validate_kenya_bounds(lat: float, lng: float) -> None:
    settings = get_settings()
    if not (settings.geofence_min_lat <= lat <= settings.geofence_max_lat) or not (
        settings.geofence_min_lng <= lng <= settings.geofence_max_lng
    ):
        raise HTTPException(status_code=400, detail=f"Coordinates must be within {settings.geofence_country}")


def _to_out(project: ExpenditureProject, ai_summary: str | None = None) -> ExpenditureProjectOut:
    lat, lng = lat_lng_from_point(project.location)
    return ExpenditureProjectOut(
        id=project.id,
        name=project.name,
        category=project.category,
        county=project.county,
        lat=lat,
        lng=lng,
        description=project.description,
        spec_label=project.spec_label,
        spec_value=project.spec_value,
        budget_allocated=project.budget_allocated,
        budget_spent=project.budget_spent,
        status=project.status,
        milestones=[Milestone(**m) for m in project.milestones],
        ai_summary=ai_summary,
    )


# --- Categories (legend/filter) ---


@router.get("/api/expenditure-categories", response_model=list[ExpenditureCategoryOut])
def list_expenditure_categories(db: Session = Depends(get_db)):
    return db.query(ExpenditureCategory).order_by(ExpenditureCategory.name).all()


@router.post("/api/admin/expenditure-categories", response_model=ExpenditureCategoryOut)
def create_expenditure_category(
    payload: ExpenditureCategoryCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    category = ExpenditureCategory(name=payload.name, color=payload.color)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name already exists") from exc
    db.refresh(category)
    return category


@router.put("/api/admin/expenditure-categories/{category_id}", response_model=ExpenditureCategoryOut)
def update_expenditure_category(
    category_id: int,
    payload: ExpenditureCategoryUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    category = db.query(ExpenditureCategory).filter(ExpenditureCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/api/admin/expenditure-categories/{category_id}", status_code=204)
def delete_expenditure_category(
    category_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    category = db.query(ExpenditureCategory).filter(ExpenditureCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()


# --- AI validation (pre-check before saving a project) ---


@router.post("/api/admin/expenditure-projects/validate", response_model=ExpenditureValidationResponse)
def validate_project(
    payload: ExpenditureValidationRequest, _admin: str = Depends(require_admin)
) -> ExpenditureValidationResponse:
    return validate_expenditure_record(payload)


# --- Projects ---


@router.get("/api/expenditure-projects", response_model=list[ExpenditureProjectOut])
def list_expenditure_projects(db: Session = Depends(get_db)):
    projects = db.query(ExpenditureProject).all()
    return [_to_out(p) for p in projects]


@router.get("/api/expenditure-projects/{project_id}", response_model=ExpenditureProjectOut)
def get_expenditure_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(ExpenditureProject).filter(ExpenditureProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ratings = (
        db.query(Rating)
        .filter(Rating.target_type == TargetType.EXPENDITURE_PROJECT, Rating.target_id == project_id)
        .all()
    )
    rating_dicts = [{"stars": r.stars, "comment": r.comment} for r in ratings]
    ai_summary = summarize_feedback(project.name, rating_dicts)
    return _to_out(project, ai_summary=ai_summary)


@router.post("/api/admin/expenditure-projects", response_model=ExpenditureProjectOut)
def create_expenditure_project(
    payload: ExpenditureProjectCreate, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    _validate_kenya_bounds(payload.lat, payload.lng)
    if not payload.acknowledged_warnings:
        check = validate_expenditure_record(
            ExpenditureValidationRequest(
                category=payload.category,
                spec_label=payload.spec_label,
                spec_value=payload.spec_value,
                budget_allocated=payload.budget_allocated,
                budget_spent=payload.budget_spent,
            )
        )
        if not check.is_valid:
            raise HTTPException(
                status_code=409,
                detail={"message": "AI validation flagged this record", "warnings": check.warnings},
            )

    project = ExpenditureProject(
        name=payload.name,
        category=payload.category,
        county=payload.county,
        location=point_from_lat_lng(payload.lat, payload.lng),
        description=payload.description,
        spec_label=payload.spec_label,
        spec_value=payload.spec_value,
        budget_allocated=payload.budget_allocated,
        budget_spent=payload.budget_spent,
        status=payload.status,
        milestones=[m.model_dump() for m in payload.milestones],
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.put("/api/admin/expenditure-projects/{project_id}", response_model=ExpenditureProjectOut)
def update_expenditure_project(
    project_id: int,
    payload: ExpenditureProjectUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    project = db.query(ExpenditureProject).filter(ExpenditureProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    data = payload.model_dump(exclude_unset=True)
    lat = data.pop("lat", None)
    lng = data.pop("lng", None)
    if lat is not None or lng is not None:
        current_lat, current_lng = lat_lng_from_point(project.location)
        new_lat = lat if lat is not None else current_lat
        new_lng = lng if lng is not None else current_lng
        _validate_kenya_bounds(new_lat, new_lng)
        project.location = point_from_lat_lng(new_lat, new_lng)

    if "milestones" in data:
        data["milestones"] = [m.model_dump() if isinstance(m, Milestone) else m for m in data["milestones"]]

    for field, value in data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.delete("/api/admin/expenditure-projects/{project_id}", status_code=204)
def delete_expenditure_project(
    project_id: int, db: Session = Depends(get_db), _admin: str = Depends(require_admin)
):
    project = db.query(ExpenditureProject).filter(ExpenditureProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
