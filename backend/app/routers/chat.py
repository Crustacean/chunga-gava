from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def ask_question(payload: ChatRequest, db: Session = Depends(get_db)):
    answer, citations, low_confidence = answer_question(db, payload.question, payload.history, payload.language)
    return ChatResponse(answer=answer, citations=citations, low_confidence=low_confidence)
