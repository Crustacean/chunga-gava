import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.knowledge_base import DocumentChunk, KnowledgeDocument
from app.schemas.knowledge_base import KnowledgeDocumentOut
from app.services.embeddings import chunk_text, embed_texts, extract_text_from_pdf
from app.services.storage import upload_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/knowledge-base", tags=["knowledge-base"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}


@router.get("", response_model=list[KnowledgeDocumentOut])
def list_documents(db: Session = Depends(get_db), _admin: str = Depends(require_admin)):
    return db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()


@router.post("", response_model=KnowledgeDocumentOut)
async def upload_document(
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF documents are supported")

    data = await file.read()
    s3_key = upload_bytes(data, key_prefix="knowledge-base", filename=file.filename, content_type=file.content_type)

    document = KnowledgeDocument(
        title=title,
        category=category,
        filename=file.filename,
        s3_key=s3_key,
        status="processing",
    )
    db.add(document)
    db.flush()

    try:
        text = extract_text_from_pdf(data)
        chunks = chunk_text(text)
        embeddings = embed_texts(chunks)
        for index, (content, embedding) in enumerate(zip(chunks, embeddings)):
            db.add(
                DocumentChunk(document_id=document.id, chunk_index=index, content=content, embedding=embedding)
            )
        document.status = "ready"
    except Exception:
        logger.exception("Failed to process document %s", document.id)
        document.status = "failed"

    db.commit()
    db.refresh(document)
    return document
