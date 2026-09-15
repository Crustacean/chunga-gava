"""Dev/testing utility for the avatar-collision fix: constructs three MCA-vs-Governor approval
scenarios with EXACT, controlled percentages (by seeding a precise approve/total ratings mix per
official) so the PeerComparisonBar's collision handling can be verified visually in every state:

  1. Close (~2 points apart)   - Baringo:  Governor 58%, MCA 60%    -> stacked/cutout avatars.
  2. Exact match (0 points)    - Bomet:    Governor 60%, MCA 60%    -> stacked/cutout avatars.
  3. Clearly separated (wide)  - Bungoma:  Governor 20%, MCA 90%    -> both centered, no overlap.

Also marks all six officials as already-voted for a given browser fingerprint so their
ManifestoModal cards open straight to the unlocked insights view.

Usage: python -m app.scripts.seed_avatar_scenarios <fingerprint_hash>
Idempotent: skips seeding ratings for an official that already has any, and skips a
(fingerprint_hash, official.id) vote pair that's already recorded.
"""

import sys

from app.db.session import Base, SessionLocal, engine
from app.models.enums import TargetType
from app.models.officials import Official
from app.models.ratings import Rating
from app.models.votes import Vote
from app.utils.cycles import current_cycle_key

# (official_id, approve_count, total_count) - stars>=4 counts as "approve" (see _approval_pct).
SCENARIOS: list[tuple[str, int, int, int, int, int]] = [
    # (label, governor_id, mca_id, gov_approve, gov_total, mca_approve)
    ("Close (~2pts)", 89, 90, 29, 50, 30),
    ("Exact match", 107, 108, 30, 50, 30),
    ("Clearly separated", 116, 117, 10, 50, 45),
]
TOTAL = 50


def _seed_exact_ratings(db, official: Official, approve: int, total: int) -> int:
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
    for i in range(total):
        stars = 5 if i < approve else 2
        db.add(
            Rating(
                target_type=TargetType.OFFICIAL,
                target_id=official.id,
                voter_id=f"demo-voter-scenario-{official.id}-{i}",
                cycle_key=cycle_key,
                stars=stars,
                comment=None,
                is_demo=True,
            )
        )
    return total


def _mark_voted(db, fingerprint_hash: str, official_id: int) -> bool:
    exists = (
        db.query(Vote)
        .filter(
            Vote.fingerprint_hash == fingerprint_hash,
            Vote.target_id == official_id,
            Vote.rating_type == "official",
        )
        .first()
    )
    if exists:
        return False
    db.add(Vote(fingerprint_hash=fingerprint_hash, target_id=official_id, rating_type="official"))
    return True


def seed(fingerprint_hash: str) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ratings_created = 0
        votes_created = 0
        for label, gov_id, mca_id, gov_approve, gov_total, mca_approve in SCENARIOS:
            governor = db.query(Official).filter(Official.id == gov_id).first()
            mca = db.query(Official).filter(Official.id == mca_id).first()
            if not governor or not mca:
                print(f"Skipping {label!r}: official {gov_id} or {mca_id} not found.")
                continue
            ratings_created += _seed_exact_ratings(db, governor, gov_approve, gov_total)
            ratings_created += _seed_exact_ratings(db, mca, mca_approve, TOTAL)
            votes_created += int(_mark_voted(db, fingerprint_hash, governor.id))
            votes_created += int(_mark_voted(db, fingerprint_hash, mca.id))
            print(
                f"{label}: Governor {governor.name} (#{governor.id}) target {gov_approve}/{gov_total}, "
                f"MCA {mca.name} (#{mca.id}) target {mca_approve}/{TOTAL}"
            )
        db.commit()
        print(f"Seeded {ratings_created} ratings, marked {votes_created} new votes for {fingerprint_hash!r}.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.seed_avatar_scenarios <fingerprint_hash>")
        sys.exit(1)
    seed(sys.argv[1])
