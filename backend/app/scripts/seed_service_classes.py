"""Seed default public-service classes (with colors) and a few demo Amenity pins so the
map's Services layer is populated out of the box.

Usage: python -m app.scripts.seed_service_classes
Idempotent: skips classes/amenities that already exist by name.
"""

from app.db.session import Base, SessionLocal, engine
from app.models.amenities import Amenity
from app.models.service_classes import ServiceClass
from app.utils.geo import point_from_lat_lng

DEFAULT_CLASSES: list[tuple[str, str]] = [
    ("Schools", "#16a34a"),  # green
    ("Huduma Centers", "#2563eb"),  # blue
    ("Government Offices", "#dc2626"),  # red
    ("Police Stations", "#ca8a04"),  # yellow
]

DEMO_AMENITIES: list[tuple[str, str, float, float, str, str]] = [
    ("Nairobi Primary School", "Schools", -1.2833, 36.8167, "Nairobi", "Open to residents; birth certificate required for enrollment."),
    ("Mombasa Huduma Center", "Huduma Centers", -4.0500, 39.6667, "Mombasa", "National ID and passport services; open Mon-Fri 8am-5pm."),
    ("Kisumu County Government Offices", "Government Offices", -0.0917, 34.7680, "Kisumu", "County business permits and land rate payments."),
    ("Eldoret Central Police Station", "Police Stations", 0.5167, 35.2833, "Uasin Gishu", "Report crimes 24/7; occurrence book entries free of charge."),
    ("Nakuru Huduma Center", "Huduma Centers", -0.3, 36.08, "Nakuru", "National ID, passport, and NHIF registration services."),
    ("Kiambu Girls Secondary School", "Schools", -1.0333, 36.8333, "Kiambu", "KCPE certificate and birth certificate required for admission."),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        name_to_class: dict[str, ServiceClass] = {}
        created_classes = 0
        for name, color in DEFAULT_CLASSES:
            existing = db.query(ServiceClass).filter(ServiceClass.name == name).first()
            if not existing:
                existing = ServiceClass(name=name, color=color)
                db.add(existing)
                db.flush()
                created_classes += 1
            name_to_class[name] = existing

        created_amenities = 0
        for name, category, lat, lng, county, access in DEMO_AMENITIES:
            if db.query(Amenity).filter(Amenity.name == name).first():
                continue
            db.add(
                Amenity(
                    name=name,
                    category=category,
                    location=point_from_lat_lng(lat, lng),
                    access_requirements=access,
                    county=county,
                    is_demo=True,
                )
            )
            created_amenities += 1

        db.commit()
        print(f"Seeded {created_classes} service classes and {created_amenities} amenities.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
