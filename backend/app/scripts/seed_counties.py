"""Seed the 47 Kenyan counties (name, default emoji, centroid lat/lng) used by the header's
location filter dropdown.

Usage: python -m app.scripts.seed_counties
Idempotent: skips counties that already exist by name (admin-edited emoji is preserved).
"""

from app.db.session import Base, SessionLocal, engine
from app.models.counties import County

# (name, emoji, lat, lng) - centroids mirror seed_kenya_leaders.py's COUNTIES.
COUNTIES: list[tuple[str, str, float, float]] = [
    ("Mombasa", "🏖️", -4.0435, 39.6682),
    ("Kwale", "🏝️", -4.1816, 39.4606),
    ("Kilifi", "🌴", -3.5107, 39.9093),
    ("Tana River", "🌊", -1.5000, 40.0000),
    ("Lamu", "⛵", -2.2717, 40.9020),
    ("Taita-Taveta", "⛰️", -3.3167, 38.4833),
    ("Garissa", "🏜️", -0.4536, 39.6461),
    ("Wajir", "🐫", 1.7471, 40.0573),
    ("Mandera", "🏜️", 3.9366, 41.8670),
    ("Marsabit", "🌋", 2.3284, 37.9899),
    ("Isiolo", "🐘", 0.3556, 37.5833),
    ("Meru", "🍵", 0.0500, 37.6500),
    ("Tharaka-Nithi", "🌾", -0.2971, 37.8880),
    ("Embu", "☕", -0.5310, 37.4575),
    ("Kitui", "🍯", -1.3667, 38.0167),
    ("Machakos", "🍇", -1.5177, 37.2634),
    ("Makueni", "🥭", -1.8039, 37.6242),
    ("Nyandarua", "🥔", -0.1833, 36.5167),
    ("Nyeri", "☕", -0.4167, 36.9500),
    ("Kirinyaga", "🌾", -0.6591, 37.3826),
    ("Murang'a", "🍍", -0.7167, 37.1500),
    ("Kiambu", "☕", -1.0333, 36.8333),
    ("Turkana", "🏜️", 3.1167, 35.6000),
    ("West Pokot", "⛰️", 1.6167, 35.3833),
    ("Samburu", "🦒", 1.2167, 36.9500),
    ("Trans Nzoia", "🌽", 1.0500, 34.9500),
    ("Uasin Gishu", "🏃", 0.5167, 35.2833),
    ("Elgeyo-Marakwet", "🏃", 0.8000, 35.5000),
    ("Nandi", "🏃", 0.1833, 35.1167),
    ("Baringo", "🦩", 0.4667, 35.9667),
    ("Laikipia", "🦁", 0.3667, 36.7833),
    ("Nakuru", "🦩", -0.3031, 36.0800),
    ("Narok", "🦓", -1.0833, 35.8667),
    ("Kajiado", "🦁", -1.8524, 36.7820),
    ("Kericho", "🍵", -0.3667, 35.2833),
    ("Bomet", "🍵", -0.7833, 35.3333),
    ("Kakamega", "🌳", 0.2833, 34.7500),
    ("Vihiga", "🌳", 0.0833, 34.7167),
    ("Bungoma", "🌽", 0.5667, 34.5667),
    ("Busia", "🎣", 0.4667, 34.1167),
    ("Siaya", "🎣", 0.0667, 34.2833),
    ("Kisumu", "🐟", -0.1000, 34.7500),
    ("Homa Bay", "🐟", -0.5167, 34.4667),
    ("Migori", "⛏️", -1.0634, 34.4731),
    ("Kisii", "🍌", -0.6833, 34.7667),
    ("Nyamira", "🍵", -0.5633, 34.9358),
    ("Nairobi", "🏙️", -1.2864, 36.8172),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created = 0
        for name, emoji, lat, lng in COUNTIES:
            if db.query(County).filter(County.name == name).first():
                continue
            db.add(County(name=name, emoji=emoji, lat=lat, lng=lng))
            created += 1
        db.commit()
        print(f"Seeded {created} counties (total defined: {len(COUNTIES)}).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
