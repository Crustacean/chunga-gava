"""Dev/testing utility for TASK.md's MCA-vs-Governor avatar collision fix: marks every Kiambu
official (governors and MCAs) as already-voted-on for a given browser fingerprint, so that
fingerprint's ManifestoModal cards open straight to the unlocked insights view (including the
peer-comparison bars) without manually submitting a rating for each official first. Kiambu
already has a governor/MCA pair sitting within a few points of each other from prior demo
ratings (see seed_mark_mundo.py), which is what makes the avatar-collision UI visible/testable.

Usage: python -m app.scripts.seed_collision_demo <fingerprint_hash>
Idempotent: skips any (fingerprint_hash, official.id) pair that's already recorded.
"""

import sys

from app.db.session import Base, SessionLocal, engine
from app.models.officials import Official
from app.models.votes import Vote


def seed(fingerprint_hash: str) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        officials = db.query(Official).filter(Official.county == "Kiambu").all()
        created = 0
        for official in officials:
            exists = (
                db.query(Vote)
                .filter(
                    Vote.fingerprint_hash == fingerprint_hash,
                    Vote.target_id == official.id,
                    Vote.rating_type == "official",
                )
                .first()
            )
            if exists:
                continue
            db.add(Vote(fingerprint_hash=fingerprint_hash, target_id=official.id, rating_type="official"))
            created += 1
        db.commit()
        print(f"Marked {created} of {len(officials)} Kiambu officials as voted for fingerprint {fingerprint_hash!r}.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.seed_collision_demo <fingerprint_hash>")
        sys.exit(1)
    seed(sys.argv[1])
