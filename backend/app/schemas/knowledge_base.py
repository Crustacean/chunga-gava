from datetime import datetime

from pydantic import BaseModel


class KnowledgeDocumentOut(BaseModel):
    id: int
    title: str
    category: str
    filename: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
