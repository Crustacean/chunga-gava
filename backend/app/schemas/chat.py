from pydantic import BaseModel


class ChatTurn(BaseModel):
    question: str
    answer: str


class ChatRequest(BaseModel):
    question: str
    # Prior turns from the same browser session (client-managed; discarded when the
    # search popup closes) so a user can enhance/append their question with more context.
    history: list[ChatTurn] = []
    # ISO-ish language code (e.g. "en", "sw"); the final answer is translated into this
    # language regardless of what language the question was asked in.
    language: str = "en"


class Citation(BaseModel):
    document_title: str
    category: str
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    low_confidence: bool = False
