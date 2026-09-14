"""Seed the 47 Kenyan counties (name, default emoji, tagline, centroid lat/lng) used by the
header's location filter dropdown.

Usage: python -m app.scripts.seed_counties
Idempotent: inserts missing counties; for existing ones it only backfills a blank tagline
(admin-edited emoji/tagline are otherwise preserved).
"""

from app.db.session import Base, SessionLocal, engine
from app.models.counties import County

# (name, emoji, tagline, lat, lng) - centroids mirror seed_kenya_leaders.py's COUNTIES.
COUNTIES: list[tuple[str, str, str, float, float]] = [
    ("Mombasa", "🏖️", "Kenya's coastal gateway", -4.0435, 39.6682),
    ("Kwale", "🏝️", "Diani's tropical beaches", -4.1816, 39.4606),
    ("Kilifi", "🌴", "Palm-lined Swahili coast", -3.5107, 39.9093),
    ("Tana River", "🌊", "The delta's river basin", -1.5000, 40.0000),
    ("Lamu", "⛵", "Historic dhow-sailing archipelago", -2.2717, 40.9020),
    ("Taita-Taveta", "⛰️", "Highlands beside Tsavo", -3.3167, 38.4833),
    ("Garissa", "🏜️", "Gateway to the northeast", -0.4536, 39.6461),
    ("Wajir", "🐫", "Nomadic pastoralist heartland", 1.7471, 40.0573),
    ("Mandera", "🏜️", "Kenya's tri-border frontier", 3.9366, 41.8670),
    ("Marsabit", "🌋", "Volcanic craters and camels", 2.3284, 37.9899),
    ("Isiolo", "🐘", "Wildlife corridor crossroads", 0.3556, 37.5833),
    ("Meru", "🍵", "Mt. Kenya's tea slopes", 0.0500, 37.6500),
    ("Tharaka-Nithi", "🌾", "Fertile eastern farmlands", -0.2971, 37.8880),
    ("Embu", "☕", "Coffee country foothills", -0.5310, 37.4575),
    ("Kitui", "🍯", "Land of wild honey", -1.3667, 38.0167),
    ("Machakos", "🍇", "Hills of Ukambani", -1.5177, 37.2634),
    ("Makueni", "🥭", "Mango orchards of Ukambani", -1.8039, 37.6242),
    ("Nyandarua", "🥔", "Aberdare potato highlands", -0.1833, 36.5167),
    ("Nyeri", "☕", "Mt. Kenya coffee country", -0.4167, 36.9500),
    ("Kirinyaga", "🌾", "Rice paddies of Mwea", -0.6591, 37.3826),
    ("Murang'a", "🍍", "Pineapple and coffee hills", -0.7167, 37.1500),
    ("Kiambu", "☕", "Nairobi's coffee-belt neighbor", -1.0333, 36.8333),
    ("Turkana", "🏜️", "Cradle of humankind", 3.1167, 35.6000),
    ("West Pokot", "⛰️", "Rugged pastoralist highlands", 1.6167, 35.3833),
    ("Samburu", "🦒", "Wildlife-rich northern plains", 1.2167, 36.9500),
    ("Trans Nzoia", "🌽", "Maize basket of Kenya", 1.0500, 34.9500),
    ("Uasin Gishu", "🏃", "Home of champion runners", 0.5167, 35.2833),
    ("Elgeyo-Marakwet", "🏃", "Escarpment of runners", 0.8000, 35.5000),
    ("Nandi", "🏃", "Tea hills and athletes", 0.1833, 35.1167),
    ("Baringo", "🦩", "Flamingo lakes and hills", 0.4667, 35.9667),
    ("Laikipia", "🦁", "Conservancy safari country", 0.3667, 36.7833),
    ("Nakuru", "🦩", "Rift Valley lake city", -0.3031, 36.0800),
    ("Narok", "🦓", "Gateway to the Mara", -1.0833, 35.8667),
    ("Kajiado", "🦁", "Maasai land of Amboseli", -1.8524, 36.7820),
    ("Kericho", "🍵", "Kenya's tea capital", -0.3667, 35.2833),
    ("Bomet", "🍵", "Green tea highlands", -0.7833, 35.3333),
    ("Kakamega", "🌳", "Kenya's last rainforest", 0.2833, 34.7500),
    ("Vihiga", "🌳", "Densely settled western hills", 0.0833, 34.7167),
    ("Bungoma", "🌽", "Mt. Elgon's maize belt", 0.5667, 34.5667),
    ("Busia", "🎣", "Lake Victoria border town", 0.4667, 34.1167),
    ("Siaya", "🎣", "Shores of Lake Victoria", 0.0667, 34.2833),
    ("Kisumu", "🐟", "Lake Victoria's port city", -0.1000, 34.7500),
    ("Homa Bay", "🐟", "Fishing shores of Nyanza", -0.5167, 34.4667),
    ("Migori", "⛏️", "Gold and border trade", -1.0634, 34.4731),
    ("Kisii", "🍌", "Banana and soapstone hills", -0.6833, 34.7667),
    ("Nyamira", "🍵", "Highland tea and dairy", -0.5633, 34.9358),
    ("Nairobi", "🏙️", "The capital, green city in the sun", -1.2864, 36.8172),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created = 0
        backfilled = 0
        existing = {c.name: c for c in db.query(County).all()}
        for name, emoji, tagline, lat, lng in COUNTIES:
            county = existing.get(name)
            if county is None:
                db.add(County(name=name, emoji=emoji, tagline=tagline, lat=lat, lng=lng))
                created += 1
            elif not county.tagline:
                county.tagline = tagline
                backfilled += 1
        db.commit()
        print(f"Seeded {created} counties, backfilled {backfilled} taglines (total defined: {len(COUNTIES)}).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
