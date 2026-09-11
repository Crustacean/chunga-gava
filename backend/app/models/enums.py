import enum


class OfficialRole(str, enum.Enum):
    GOVERNOR = "governor"
    MCA = "mca"


class ReportFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class TargetType(str, enum.Enum):
    OFFICIAL = "official"
    AMENITY = "amenity"
    EXPENDITURE_PROJECT = "expenditure_project"


class ExpenditureStatus(str, enum.Enum):
    PLANNED = "planned"
    ONGOING = "ongoing"
    STALLED = "stalled"
    COMPLETED = "completed"


class DispatchChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
