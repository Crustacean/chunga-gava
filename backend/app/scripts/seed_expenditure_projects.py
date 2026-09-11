"""Seed demo public-expenditure categories and a spread of mock infrastructure project
records across several counties (roads, schools, hospitals, stadiums, initiatives).

Usage: python -m app.scripts.seed_expenditure_projects
Idempotent: skips categories/projects that already exist by name.
"""

from app.db.session import Base, SessionLocal, engine
from app.models.enums import ExpenditureStatus
from app.models.expenditure_categories import ExpenditureCategory
from app.models.expenditure_projects import ExpenditureProject
from app.utils.geo import point_from_lat_lng

DEFAULT_CATEGORIES: list[tuple[str, str]] = [
    ("Roads", "#f97316"),
    ("Schools", "#16a34a"),
    ("Hospitals", "#0ea5e9"),
    ("Stadiums", "#7c3aed"),
    ("Initiatives", "#eab308"),
]

# (name, category, county, lat, lng, description, spec_label, spec_value,
#  allocated, spent, status, milestones)
PROJECTS: list[tuple] = [
    (
        "Nairobi-Thika Superhighway Rehabilitation",
        "Roads",
        "Nairobi",
        -1.2200,
        36.8900,
        "Resurfacing and drainage upgrade of a major arterial road.",
        "Road Length",
        "42 km",
        4_200_000_000,
        3_100_000_000,
        ExpenditureStatus.ONGOING,
        [
            {"date": "2024-02-01", "milestone": "started", "note": "Groundbreaking ceremony"},
            {"date": "2024-11-15", "milestone": "stalled", "note": "Paused for rainy season"},
            {"date": "2025-02-01", "milestone": "resumed", "note": "Works resumed"},
        ],
    ),
    (
        "Mombasa Coastal Bypass",
        "Roads",
        "Mombasa",
        -4.0300,
        39.6400,
        "New bypass to reduce port-access congestion.",
        "Road Length",
        "18 km",
        2_800_000_000,
        2_750_000_000,
        ExpenditureStatus.COMPLETED,
        [
            {"date": "2022-06-01", "milestone": "started", "note": ""},
            {"date": "2024-09-30", "milestone": "finished", "note": "Officially opened"},
        ],
    ),
    (
        "Kisumu-Kakamega Link Road",
        "Roads",
        "Kisumu",
        -0.0800,
        34.8200,
        "Tarmacking of a regional link road connecting market centers.",
        "Road Length",
        "35 km",
        1_900_000_000,
        400_000_000,
        ExpenditureStatus.STALLED,
        [
            {"date": "2023-05-01", "milestone": "started", "note": ""},
            {"date": "2024-01-10", "milestone": "stalled", "note": "Contractor dispute"},
        ],
    ),
    (
        "Nakuru Model Primary School",
        "Schools",
        "Nakuru",
        -0.3100,
        36.0700,
        "New 12-classroom primary school block with a science lab.",
        "Classrooms",
        "12 classrooms + 1 lab",
        85_000_000,
        60_000_000,
        ExpenditureStatus.ONGOING,
        [
            {"date": "2024-08-01", "milestone": "started", "note": ""},
        ],
    ),
    (
        "Garissa Girls Secondary School Expansion",
        "Schools",
        "Garissa",
        -0.4500,
        39.6500,
        "Dormitory and classroom expansion to increase enrollment capacity.",
        "New capacity",
        "+300 students",
        60_000_000,
        60_000_000,
        ExpenditureStatus.COMPLETED,
        [
            {"date": "2022-01-15", "milestone": "started", "note": ""},
            {"date": "2023-03-01", "milestone": "finished", "note": ""},
        ],
    ),
    (
        "Kericho County Referral Hospital Upgrade",
        "Hospitals",
        "Kericho",
        -0.3600,
        35.2900,
        "New maternity wing and equipment upgrade.",
        "New beds",
        "80 beds",
        320_000_000,
        150_000_000,
        ExpenditureStatus.ONGOING,
        [
            {"date": "2024-03-01", "milestone": "started", "note": ""},
        ],
    ),
    (
        "Turkana Mobile Health Initiative",
        "Hospitals",
        "Turkana",
        3.1200,
        35.6000,
        "Mobile clinics program serving remote pastoralist communities.",
        "Clinics deployed",
        "6 mobile units",
        95_000_000,
        95_000_000,
        ExpenditureStatus.COMPLETED,
        [
            {"date": "2023-01-01", "milestone": "started", "note": ""},
            {"date": "2023-12-01", "milestone": "finished", "note": ""},
        ],
    ),
    (
        "Eldoret Sports Stadium Renovation",
        "Stadiums",
        "Uasin Gishu",
        0.5200,
        35.2700,
        "Renovation of the main athletics stadium ahead of national trials.",
        "Capacity",
        "20,000 seats",
        1_100_000_000,
        250_000_000,
        ExpenditureStatus.STALLED,
        [
            {"date": "2023-09-01", "milestone": "started", "note": ""},
            {"date": "2024-04-01", "milestone": "stalled", "note": "Funding shortfall"},
        ],
    ),
    (
        "Kajiado County Stadium",
        "Stadiums",
        "Kajiado",
        -1.8500,
        36.7800,
        "New multi-purpose county stadium.",
        "Capacity",
        "8,000 seats",
        450_000_000,
        20_000_000,
        ExpenditureStatus.PLANNED,
        [],
    ),
    (
        "Kiambu Digital Skills Hub Initiative",
        "Initiatives",
        "Kiambu",
        -1.0300,
        36.8300,
        "County-wide youth digital skills training program.",
        "Beneficiaries",
        "5,000 youth/year",
        150_000_000,
        90_000_000,
        ExpenditureStatus.ONGOING,
        [
            {"date": "2024-01-10", "milestone": "started", "note": ""},
        ],
    ),
    (
        "Homa Bay Fisheries Modernization Initiative",
        "Initiatives",
        "Homa Bay",
        -0.5200,
        34.4600,
        "Cold storage and market infrastructure for Lake Victoria fisherfolk.",
        "Cold storage units",
        "12 units",
        210_000_000,
        60_000_000,
        ExpenditureStatus.ONGOING,
        [
            {"date": "2024-05-01", "milestone": "started", "note": ""},
        ],
    ),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created_categories = 0
        for name, color in DEFAULT_CATEGORIES:
            if not db.query(ExpenditureCategory).filter(ExpenditureCategory.name == name).first():
                db.add(ExpenditureCategory(name=name, color=color))
                created_categories += 1
        db.flush()

        created_projects = 0
        for (
            name,
            category,
            county,
            lat,
            lng,
            description,
            spec_label,
            spec_value,
            allocated,
            spent,
            status,
            milestones,
        ) in PROJECTS:
            if db.query(ExpenditureProject).filter(ExpenditureProject.name == name).first():
                continue
            db.add(
                ExpenditureProject(
                    name=name,
                    category=category,
                    county=county,
                    location=point_from_lat_lng(lat, lng),
                    description=description,
                    spec_label=spec_label,
                    spec_value=spec_value,
                    budget_allocated=allocated,
                    budget_spent=spent,
                    status=status,
                    milestones=milestones,
                    is_demo=True,
                )
            )
            created_projects += 1

        db.commit()
        print(f"Seeded {created_categories} expenditure categories and {created_projects} projects.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
