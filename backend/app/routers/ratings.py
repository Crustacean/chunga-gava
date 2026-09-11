from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.amenities import Amenity
from app.models.enums import ReportFrequency, TargetType
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import ManifestoItem, Official
from app.models.ratings import Rating
from app.schemas.ratings import RatingOut
from app.services.storage import upload_bytes
from app.services.votes import register_vote_or_409
from app.utils.cycles import current_cycle_key

router = APIRouter(prefix="/api/ratings", tags=["ratings"])

# Amenities and expenditure projects don't have an admin-configured dispatch frequency,
# so their ratings cycle monthly.
AMENITY_CYCLE_FREQUENCY = ReportFrequency.MONTHLY


@router.post("", response_model=RatingOut)
async def submit_rating(
    target_type: TargetType = Form(...),
    target_id: int = Form(...),
    voter_id: str = Form(...),
    fingerprint_hash: str = Form(...),
    stars: int = Form(..., ge=1, le=5),
    manifesto_item_id: int | None = Form(None),
    comment: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    if target_type == TargetType.OFFICIAL:
        official = db.query(Official).filter(Official.id == target_id).first()
        if not official:
            raise HTTPException(status_code=404, detail="Official not found")
        cycle_key = current_cycle_key(official.report_frequency)
        label = official.name
        vote_frequency = official.report_frequency
    elif target_type == TargetType.EXPENDITURE_PROJECT:
        project = db.query(ExpenditureProject).filter(ExpenditureProject.id == target_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        cycle_key = current_cycle_key(AMENITY_CYCLE_FREQUENCY)
        label = project.name
        vote_frequency = AMENITY_CYCLE_FREQUENCY
    else:
        amenity = db.query(Amenity).filter(Amenity.id == target_id).first()
        if not amenity:
            raise HTTPException(status_code=404, detail="Amenity not found")
        cycle_key = current_cycle_key(AMENITY_CYCLE_FREQUENCY)
        label = amenity.name
        vote_frequency = AMENITY_CYCLE_FREQUENCY

    # A manifesto-item rating and an official's "overall" rating are distinct vote targets,
    # even though both carry target_type=official - this keeps them isolated per Test B.
    # Both still follow that same official's configured report_frequency (a manifesto item
    # has no cadence of its own - it inherits its parent official's dispatch schedule).
    vote_rating_type = target_type.value
    vote_target_id = target_id
    if manifesto_item_id is not None:
        manifesto_item = db.query(ManifestoItem).filter(ManifestoItem.id == manifesto_item_id).first()
        if not manifesto_item:
            raise HTTPException(status_code=404, detail="Manifesto item not found")
        vote_rating_type = "manifesto"
        vote_target_id = manifesto_item_id
        label = f'"{manifesto_item.title}"'

    register_vote_or_409(db, fingerprint_hash, vote_target_id, vote_rating_type, label, vote_frequency)

    photo_url = None
    if photo is not None:
        data = await photo.read()
        key = upload_bytes(data, key_prefix="ratings", filename=photo.filename, content_type=photo.content_type)
        photo_url = key

    rating = Rating(
        target_type=target_type,
        target_id=target_id,
        manifesto_item_id=manifesto_item_id,
        voter_id=voter_id,
        cycle_key=cycle_key,
        stars=stars,
        comment=comment,
        photo_url=photo_url,
    )
    db.add(rating)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="You have already voted on this item during the current cycle"
        ) from exc
    db.refresh(rating)
    return rating
