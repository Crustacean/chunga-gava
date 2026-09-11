"""Seed demo/mock data: one Governor per Kenyan county plus a couple of MCAs per
county, with placeholder (initials-based, no real photos) profile pictures.

Usage: python -m app.scripts.seed_kenya_leaders
Idempotent: skips a county's governor if one with that name already exists.
"""

import hashlib

from app.db.session import Base, SessionLocal, engine
from app.models.enums import OfficialRole, ReportFrequency
from app.models.officials import ManifestoItem, Official
from app.utils.geo import point_from_lat_lng

# Approximate county-town centroids (lat, lng) for Kenya's 47 counties.
COUNTIES: list[tuple[str, float, float]] = [
    ("Mombasa", -4.0435, 39.6682),
    ("Kwale", -4.1816, 39.4606),
    ("Kilifi", -3.5107, 39.9093),
    ("Tana River", -1.5000, 40.0000),
    ("Lamu", -2.2717, 40.9020),
    ("Taita-Taveta", -3.3167, 38.4833),
    ("Garissa", -0.4536, 39.6461),
    ("Wajir", 1.7471, 40.0573),
    ("Mandera", 3.9366, 41.8670),
    ("Marsabit", 2.3284, 37.9899),
    ("Isiolo", 0.3556, 37.5833),
    ("Meru", 0.0500, 37.6500),
    ("Tharaka-Nithi", -0.2971, 37.8880),
    ("Embu", -0.5310, 37.4575),
    ("Kitui", -1.3667, 38.0167),
    ("Machakos", -1.5177, 37.2634),
    ("Makueni", -1.8039, 37.6242),
    ("Nyandarua", -0.1833, 36.5167),
    ("Nyeri", -0.4167, 36.9500),
    ("Kirinyaga", -0.6591, 37.3826),
    ("Murang'a", -0.7167, 37.1500),
    ("Kiambu", -1.0333, 36.8333),
    ("Turkana", 3.1167, 35.6000),
    ("West Pokot", 1.6167, 35.3833),
    ("Samburu", 1.2167, 36.9500),
    ("Trans Nzoia", 1.0500, 34.9500),
    ("Uasin Gishu", 0.5167, 35.2833),
    ("Elgeyo-Marakwet", 0.8000, 35.5000),
    ("Nandi", 0.1833, 35.1167),
    ("Baringo", 0.4667, 35.9667),
    ("Laikipia", 0.3667, 36.7833),
    ("Nakuru", -0.3031, 36.0800),
    ("Narok", -1.0833, 35.8667),
    ("Kajiado", -1.8524, 36.7820),
    ("Kericho", -0.3667, 35.2833),
    ("Bomet", -0.7833, 35.3333),
    ("Kakamega", 0.2833, 34.7500),
    ("Vihiga", 0.0833, 34.7167),
    ("Bungoma", 0.5667, 34.5667),
    ("Busia", 0.4667, 34.1167),
    ("Siaya", 0.0667, 34.2833),
    ("Kisumu", -0.1000, 34.7500),
    ("Homa Bay", -0.5167, 34.4667),
    ("Migori", -1.0634, 34.4731),
    ("Kisii", -0.6833, 34.7667),
    ("Nyamira", -0.5633, 34.9358),
    ("Nairobi", -1.2864, 36.8172),
]

FIRST_NAMES = [
    "James", "Mary", "John", "Grace", "Peter", "Faith", "David", "Joyce", "Samuel", "Esther",
    "Daniel", "Ann", "Joseph", "Lucy", "Paul", "Jane", "Francis", "Agnes", "Michael", "Ruth",
]
LAST_NAMES = [
    "Mwangi", "Otieno", "Wanjiru", "Kiptoo", "Achieng", "Njoroge", "Cheruiyot", "Wafula",
    "Kamau", "Odhiambo", "Chepkoech", "Mutua", "Nyaga", "Barasa", "Kilonzo", "Wekesa",
]
MANIFESTO_TOPICS = [
    ("Roads & Infrastructure", "Tarmac priority roads and improve rural access routes."),
    ("Healthcare", "Equip level-4 hospitals and reduce maternal mortality."),
    ("Water & Sanitation", "Expand piped water coverage to underserved wards."),
    ("Education Bursaries", "Increase county bursary allocation for needy students."),
    ("Agriculture", "Subsidize farm inputs and build produce aggregation centers."),
]


def _slug_seed(*parts: str) -> int:
    return int(hashlib.sha1("-".join(parts).encode()).hexdigest()[:8], 16)


def _avatar_url(name: str, seed: str) -> str:
    colors = ["1a73e8", "0b3d91", "2e7d32", "6d4c41", "ad1457", "455a64", "ef6c00"]
    color = colors[_slug_seed(seed) % len(colors)]
    initials = "+".join(part[0] for part in name.split()[:2]).upper()
    return f"https://ui-avatars.com/api/?name={initials}&background={color}&color=fff&size=128&bold=true"


def _pick_name(seed: str) -> str:
    idx = _slug_seed(seed)
    return f"{FIRST_NAMES[idx % len(FIRST_NAMES)]} {LAST_NAMES[(idx // len(FIRST_NAMES)) % len(LAST_NAMES)]}"


def _manifesto_items(seed: str) -> list[ManifestoItem]:
    idx = _slug_seed(seed)
    picks = [MANIFESTO_TOPICS[(idx + i) % len(MANIFESTO_TOPICS)] for i in range(3)]
    return [ManifestoItem(title=title, description=desc) for title, desc in picks]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created_governors = 0
        created_mcas = 0
        for county, lat, lng in COUNTIES:
            gov_name = f"{_pick_name(f'gov-{county}')} (Governor)"
            existing = db.query(Official).filter(Official.name == gov_name, Official.county == county).first()
            if not existing:
                governor = Official(
                    name=gov_name,
                    role=OfficialRole.GOVERNOR,
                    county=county,
                    ward=None,
                    photo_url=_avatar_url(gov_name, f"gov-{county}"),
                    location=point_from_lat_lng(lat, lng),
                    report_frequency=ReportFrequency.MONTHLY,
                    is_demo=True,
                )
                governor.manifesto_items = _manifesto_items(f"gov-{county}")
                db.add(governor)
                created_governors += 1

            for i, ward_suffix in enumerate(["Central", "East"]):
                ward_name = f"{county} {ward_suffix} Ward"
                mca_name = f"{_pick_name(f'mca-{county}-{i}')} (MCA)"
                existing_mca = (
                    db.query(Official).filter(Official.name == mca_name, Official.ward == ward_name).first()
                )
                if existing_mca:
                    continue
                # Offset MCA wards slightly around the county centroid.
                offset = 0.06 * (1 if i % 2 == 0 else -1)
                mca = Official(
                    name=mca_name,
                    role=OfficialRole.MCA,
                    county=county,
                    ward=ward_name,
                    photo_url=_avatar_url(mca_name, f"mca-{county}-{i}"),
                    location=point_from_lat_lng(lat + offset, lng + offset / 2),
                    report_frequency=ReportFrequency.QUARTERLY,
                    is_demo=True,
                )
                mca.manifesto_items = _manifesto_items(f"mca-{county}-{i}")
                db.add(mca)
                created_mcas += 1

        db.commit()
        print(f"Seeded {created_governors} governors and {created_mcas} MCAs (counties: {len(COUNTIES)}).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
