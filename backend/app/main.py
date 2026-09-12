import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import Base, engine
from app.models import *  # noqa: F401,F403 - register models with SQLAlchemy metadata
from app.routers import (
    amenities,
    auth,
    chat,
    counties,
    expenditure,
    knowledge_base,
    officials,
    ratings,
    reports,
    service_classes,
    sms,
    votes,
)
from app.services.scheduler import start_scheduler, stop_scheduler

# Without this, the root logger defaults to WARNING and app-level logger.info(...) calls (e.g.
# the SMS gateway's dev-mode "would have sent" log) are silently dropped from `kubectl logs`.
logging.basicConfig(level=logging.INFO)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Chunga Gava API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(knowledge_base.router)
app.include_router(officials.router)
app.include_router(amenities.router)
app.include_router(ratings.router)
app.include_router(chat.router)
app.include_router(sms.router)
app.include_router(reports.router)
app.include_router(service_classes.router)
app.include_router(counties.router)
app.include_router(expenditure.router)
app.include_router(votes.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "country": settings.geofence_country}
