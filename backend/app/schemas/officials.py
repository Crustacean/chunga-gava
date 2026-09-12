from pydantic import BaseModel, Field

from app.models.enums import OfficialRole, ReportFrequency


class ManifestoItemIn(BaseModel):
    title: str
    description: str


class ManifestoItemOut(ManifestoItemIn):
    id: int

    model_config = {"from_attributes": True}


class OfficialCreate(BaseModel):
    name: str
    role: OfficialRole
    county: str
    ward: str | None = None
    photo_url: str | None = None
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    report_frequency: ReportFrequency = ReportFrequency.MONTHLY
    contact_email: str | None = None
    contact_phone: str | None = None
    manifesto_items: list[ManifestoItemIn] = []


class OfficialUpdate(BaseModel):
    name: str | None = None
    county: str | None = None
    ward: str | None = None
    photo_url: str | None = None
    lat: float | None = None
    lng: float | None = None
    report_frequency: ReportFrequency | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class OfficialOut(BaseModel):
    id: int
    name: str
    role: OfficialRole
    county: str
    ward: str | None
    photo_url: str | None
    lat: float
    lng: float
    report_frequency: ReportFrequency
    manifesto_items: list[ManifestoItemOut] = []


class VoteStatusOut(BaseModel):
    voted: bool


class OfficialInsightsOut(BaseModel):
    ai_summary: str
    approval_pct: float
    disapproval_pct: float
    approval_count: int
    disapproval_count: int
    total_ratings: int
    county_budget_allocated: float
    county_budget_spent: float
    county_expenditure_pct: float
