from pydantic import BaseModel, Field


class CountyCreate(BaseModel):
    name: str
    emoji: str = "📍"
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class CountyUpdate(BaseModel):
    emoji: str | None = None
    lat: float | None = None
    lng: float | None = None


class CountyOut(BaseModel):
    id: int
    name: str
    emoji: str
    lat: float
    lng: float

    model_config = {"from_attributes": True}
