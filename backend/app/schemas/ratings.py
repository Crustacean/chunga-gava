from pydantic import BaseModel, Field

from app.models.enums import TargetType


class RatingCreate(BaseModel):
    target_type: TargetType
    target_id: int
    manifesto_item_id: int | None = None
    stars: int = Field(ge=1, le=5)
    comment: str | None = None
    photo_url: str | None = None


class RatingOut(BaseModel):
    id: int
    target_type: TargetType
    target_id: int
    stars: int
    comment: str | None
    photo_url: str | None

    model_config = {"from_attributes": True}
