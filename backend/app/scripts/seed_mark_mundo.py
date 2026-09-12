"""Ensure "Mark Mundo" (Kiambu governor, a bespoke demo fixture referenced directly by
TASK.md) has a profile avatar, and top up sample overall ratings for him and the surrounding
Kiambu officials seeded by seed_kenya_leaders.py, so the leader pop-up's anti-bias rating gate,
approval graph, and AI summary have real demo content to show.

Usage: python -m app.scripts.seed_mark_mundo
Idempotent: only fills in missing fields, and only seeds ratings for a target that has none yet.
"""

from app.db.session import Base, SessionLocal, engine
from app.models.enums import TargetType
from app.models.officials import Official
from app.models.ratings import Rating
from app.utils.cycles import current_cycle_key

MARK_MUNDO_PHOTO_URL = "https://ui-avatars.com/api/?name=Mark+Mundo&background=1b5e20&color=fff&size=128&bold=true"
MARK_MUNDO_CONTACT_EMAIL = "mark.mundo@kiambu.go.ke"

# Mix of approval (>=4 stars) and disapproval (<4 stars) so the approval bar graph and AI
# summary have something meaningful to show, not just a wall of 5-star ratings.
SAMPLE_FEEDBACK: list[tuple[int, str]] = [
    (5, "Very responsive to constituent complaints on social media."),
    (4, "Roads in my area have visibly improved this year."),
    (2, "Promises made during the campaign still haven't materialized."),
    (3, "Some progress, but communication with residents could be better."),
]


def _seed_overall_ratings(db, official: Official) -> int:
    existing = (
        db.query(Rating)
        .filter(
            Rating.target_type == TargetType.OFFICIAL,
            Rating.target_id == official.id,
            Rating.manifesto_item_id.is_(None),
        )
        .count()
    )
    if existing:
        return 0
    cycle_key = current_cycle_key(official.report_frequency)
    for i, (stars, comment) in enumerate(SAMPLE_FEEDBACK):
        db.add(
            Rating(
                target_type=TargetType.OFFICIAL,
                target_id=official.id,
                voter_id=f"demo-voter-official-{official.id}-{i}",
                cycle_key=cycle_key,
                stars=stars,
                comment=comment,
                is_demo=True,
            )
        )
    return len(SAMPLE_FEEDBACK)


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        mark_mundo = db.query(Official).filter(Official.name == "Mark Mundo").first()
        if mark_mundo:
            if not mark_mundo.photo_url:
                mark_mundo.photo_url = MARK_MUNDO_PHOTO_URL
            if not mark_mundo.contact_email:
                mark_mundo.contact_email = MARK_MUNDO_CONTACT_EMAIL

        kiambu_officials = db.query(Official).filter(Official.county == "Kiambu").all()
        ratings_created = 0
        for official in kiambu_officials:
            ratings_created += _seed_overall_ratings(db, official)

        db.commit()
        print(
            f"Updated Mark Mundo's profile (avatar/contact) and seeded {ratings_created} sample "
            f"overall ratings across {len(kiambu_officials)} Kiambu officials."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
