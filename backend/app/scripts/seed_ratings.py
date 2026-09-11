"""Seed sample citizen ratings/comments across existing leader (Official) and public
expenditure project records so the AI feedback-summary widgets have real content to work
with out of the box.

Usage: python -m app.scripts.seed_ratings
Idempotent: skips a target that already has a demo rating.
"""

from app.db.session import Base, SessionLocal, engine
from app.models.enums import ReportFrequency, TargetType
from app.models.expenditure_projects import ExpenditureProject
from app.models.officials import Official
from app.models.ratings import Rating
from app.utils.cycles import current_cycle_key

LEADER_FEEDBACK: list[tuple[int, str]] = [
    (4, "Attends most public forums and responds to constituent letters."),
    (2, "Rarely visible in the ward outside of election season."),
    (5, "Delivered on the borehole project promised last year."),
    (3, "Mixed record - good on health, slow on roads."),
]

PROJECT_FEEDBACK: list[tuple[int, str]] = [
    (2, "Work has stalled for months with no visible activity on site."),
    (4, "Progressing well, contractors on site most days."),
    (1, "Budget seems way too high for what has actually been built."),
    (5, "Finished ahead of schedule and quality looks solid."),
]


def _cycle_key_for(target: Official | ExpenditureProject) -> str:
    if isinstance(target, Official):
        return current_cycle_key(target.report_frequency)
    return current_cycle_key(ReportFrequency.MONTHLY)


def _seed_for_target(
    db, target_type: TargetType, target: Official | ExpenditureProject, feedback: list[tuple[int, str]]
) -> int:
    already = (
        db.query(Rating)
        .filter(Rating.target_type == target_type, Rating.target_id == target.id, Rating.is_demo.is_(True))
        .first()
    )
    if already:
        return 0
    cycle_key = _cycle_key_for(target)
    created = 0
    for i, (stars, comment) in enumerate(feedback):
        db.add(
            Rating(
                target_type=target_type,
                target_id=target.id,
                voter_id=f"demo-voter-{target_type.value}-{target.id}-{i}",
                cycle_key=cycle_key,
                stars=stars,
                comment=comment,
                is_demo=True,
            )
        )
        created += 1
    return created


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created = 0
        officials = db.query(Official).filter(Official.is_demo.is_(True)).limit(15).all()
        for i, official in enumerate(officials):
            feedback = [LEADER_FEEDBACK[(i + j) % len(LEADER_FEEDBACK)] for j in range(3)]
            created += _seed_for_target(db, TargetType.OFFICIAL, official, feedback)

        projects = db.query(ExpenditureProject).filter(ExpenditureProject.is_demo.is_(True)).all()
        for i, project in enumerate(projects):
            feedback = [PROJECT_FEEDBACK[(i + j) % len(PROJECT_FEEDBACK)] for j in range(3)]
            created += _seed_for_target(db, TargetType.EXPENDITURE_PROJECT, project, feedback)

        db.commit()
        print(
            f"Seeded {created} sample ratings across {len(officials)} leaders and "
            f"{len(projects)} expenditure projects."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
