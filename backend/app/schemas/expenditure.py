from pydantic import BaseModel, Field

from app.models.enums import ExpenditureStatus


class ExpenditureCategoryCreate(BaseModel):
    name: str
    color: str


class ExpenditureCategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class ExpenditureCategoryOut(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class Milestone(BaseModel):
    date: str
    milestone: str  # "started" | "stalled" | "resumed" | "finished"
    note: str | None = None


class ExpenditureProjectBase(BaseModel):
    name: str
    category: str
    county: str | None = None
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    description: str = ""
    spec_label: str | None = None
    spec_value: str | None = None
    budget_allocated: float = Field(ge=0)
    budget_spent: float = Field(ge=0)
    status: ExpenditureStatus = ExpenditureStatus.PLANNED
    milestones: list[Milestone] = []


class ExpenditureProjectCreate(ExpenditureProjectBase):
    # Set true once the admin has seen and dismissed any AI validation warnings.
    acknowledged_warnings: bool = False


class ExpenditureProjectUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    county: str | None = None
    lat: float | None = None
    lng: float | None = None
    description: str | None = None
    spec_label: str | None = None
    spec_value: str | None = None
    budget_allocated: float | None = None
    budget_spent: float | None = None
    status: ExpenditureStatus | None = None
    milestones: list[Milestone] | None = None


class ExpenditureProjectOut(BaseModel):
    id: int
    name: str
    category: str
    county: str | None
    lat: float
    lng: float
    description: str
    spec_label: str | None
    spec_value: str | None
    budget_allocated: float
    budget_spent: float
    status: ExpenditureStatus
    milestones: list[Milestone]
    ai_summary: str | None = None


class ExpenditureValidationRequest(BaseModel):
    category: str
    spec_label: str | None = None
    spec_value: str | None = None
    budget_allocated: float
    budget_spent: float


class ExpenditureValidationResponse(BaseModel):
    is_valid: bool
    warnings: list[str]
