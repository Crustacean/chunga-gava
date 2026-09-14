"""Seed a country-wide spread of public-service amenities across all 47 counties.

Grounding for how many of each category to seed (real facility counts are far larger than
what a demo dataset can enumerate without a licensed address list, so each category is
seeded as a representative sample per county rather than an exhaustive directory):

- Government Offices: exactly 1 per county is a structural fact, not an estimate - the 2010
  Constitution/County Governments Act created exactly 47 county governments, each with one
  headquarters. -> 47 amenities.
- Huduma Centers: Huduma Kenya's own public reporting states its one-stop-shop centres have
  been rolled out to all 47 counties. -> 47 amenities (1 per county).
- Schools: Kenya has tens of thousands of public schools (Ministry of Education / KNBS
  Economic Survey figures put primary + secondary schools in the ~40,000+ range
  nationally), far beyond what can be enumerated here. -> 2 flagship schools per county
  (94 total) as a representative sample, not the full count.
- Police Stations: the National Police Service reports roughly 1,900+ stations/posts
  nationally, again too many to enumerate individually. -> 2 flagship stations per county
  (94 total) as a representative sample.

Usage: python -m app.scripts.seed_public_services
Idempotent: skips amenities that already exist by name.
"""

import hashlib

from app.db.session import Base, SessionLocal, engine
from app.models.amenities import Amenity
from app.models.service_classes import ServiceClass
from app.scripts.seed_counties import COUNTIES
from app.utils.geo import point_from_lat_lng

DEFAULT_CLASSES: list[tuple[str, str]] = [
    ("Schools", "#16a34a"),
    ("Huduma Centers", "#2563eb"),
    ("Government Offices", "#dc2626"),
    ("Police Stations", "#ca8a04"),
]


def _jitter(seed: str, magnitude: float = 0.06) -> float:
    """Deterministic small offset so same-county amenities don't all stack on one point."""
    digest = int(hashlib.sha1(seed.encode()).hexdigest()[:8], 16)
    return ((digest % 2000) / 1000 - 1) * magnitude


def _amenities_for_county(name: str, lat: float, lng: float) -> list[tuple[str, str, float, float, str]]:
    gov_lat, gov_lng = lat + _jitter(f"gov-{name}"), lng + _jitter(f"gov-{name}-2")
    huduma_lat, huduma_lng = lat + _jitter(f"huduma-{name}"), lng + _jitter(f"huduma-{name}-2")

    entries = [
        (
            f"{name} County Government Offices",
            "Government Offices",
            gov_lat,
            gov_lng,
            "County business permits, land rate payments, and county government services.",
        ),
        (
            f"{name} Huduma Center",
            "Huduma Centers",
            huduma_lat,
            huduma_lng,
            "National ID, passport, NHIF, and other government services; open Mon-Fri 8am-5pm.",
        ),
    ]
    for i, school_type in enumerate(["Primary School", "Secondary School"]):
        entries.append(
            (
                f"{name} {school_type}",
                "Schools",
                lat + _jitter(f"school-{name}-{i}"),
                lng + _jitter(f"school-{name}-{i}-2"),
                "Open to county residents; birth certificate and immunization record required for enrollment.",
            )
        )
    for i, station_type in enumerate(["Central Police Station", "Traffic Police Station"]):
        entries.append(
            (
                f"{name} {station_type}",
                "Police Stations",
                lat + _jitter(f"police-{name}-{i}"),
                lng + _jitter(f"police-{name}-{i}-2"),
                "Report crimes 24/7; occurrence book entries are free of charge.",
            )
        )
    return entries


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created_classes = 0
        for class_name, color in DEFAULT_CLASSES:
            if not db.query(ServiceClass).filter(ServiceClass.name == class_name).first():
                db.add(ServiceClass(name=class_name, color=color))
                created_classes += 1
        db.flush()

        created_amenities = 0
        for county_name, _emoji, _tagline, lat, lng in COUNTIES:
            for name, category, a_lat, a_lng, access in _amenities_for_county(county_name, lat, lng):
                if db.query(Amenity).filter(Amenity.name == name).first():
                    continue
                db.add(
                    Amenity(
                        name=name,
                        category=category,
                        location=point_from_lat_lng(a_lat, a_lng),
                        access_requirements=access,
                        county=county_name,
                        is_demo=True,
                    )
                )
                created_amenities += 1

        db.commit()
        print(
            f"Seeded {created_classes} service classes and {created_amenities} amenities "
            f"across {len(COUNTIES)} counties."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
