"""Dev-only utility to remove seeded/mock demo records (and any ratings against them)
before a production deployment. Real, admin-entered or citizen-submitted data (is_demo=False)
is left untouched.

Usage: python -m app.scripts.purge_demo_data
"""

from sqlalchemy import or_

from app.db.session import SessionLocal
from app.models.amenities import Amenity
from app.models.enums import TargetType
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import Official
from app.models.ratings import Rating


def purge() -> None:
    db = SessionLocal()
    try:
        demo_official_ids = [row[0] for row in db.query(Official.id).filter(Official.is_demo.is_(True))]
        demo_amenity_ids = [row[0] for row in db.query(Amenity.id).filter(Amenity.is_demo.is_(True))]
        demo_project_ids = [row[0] for row in db.query(ExpenditureProject.id).filter(ExpenditureProject.is_demo.is_(True))]

        ratings_deleted = (
            db.query(Rating)
            .filter(
                or_(
                    Rating.is_demo.is_(True),
                    (Rating.target_type == TargetType.OFFICIAL) & Rating.target_id.in_(demo_official_ids),
                    (Rating.target_type == TargetType.AMENITY) & Rating.target_id.in_(demo_amenity_ids),
                    (Rating.target_type == TargetType.EXPENDITURE_PROJECT) & Rating.target_id.in_(demo_project_ids),
                )
            )
            .delete(synchronize_session=False)
        )
        projects_deleted = (
            db.query(ExpenditureProject).filter(ExpenditureProject.id.in_(demo_project_ids)).delete(synchronize_session=False)
        )
        amenities_deleted = (
            db.query(Amenity).filter(Amenity.id.in_(demo_amenity_ids)).delete(synchronize_session=False)
        )
        # ManifestoItems cascade via ON DELETE CASCADE at the DB level.
        officials_deleted = (
            db.query(Official).filter(Official.id.in_(demo_official_ids)).delete(synchronize_session=False)
        )
        db.commit()
        print(
            f"Purged {ratings_deleted} ratings, {projects_deleted} expenditure projects, "
            f"{amenities_deleted} amenities, {officials_deleted} officials (all marked is_demo=True)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    purge()
