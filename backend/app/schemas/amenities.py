from pydantic import BaseModel, Field


class AmenityCreate(BaseModel):
    name: str
    category: str
    access_requirements: str
    county: str | None = None
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class AmenityOut(BaseModel):
    id: int
    name: str
    category: str
    access_requirements: str
    county: str | None
    lat: float
    lng: float
    ai_summary: str | None = None
