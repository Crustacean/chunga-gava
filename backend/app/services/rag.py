import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.knowledge_base import DocumentChunk, KnowledgeDocument
from app.schemas.chat import ChatTurn, Citation
from app.services.embeddings import embed_query, get_openai_client

settings = get_settings()
logger = logging.getLogger(__name__)

TOP_K = 5
# Cosine distance above this is treated as a weak match - the KB probably doesn't cover the
# question, so the caller surfaces a "can you add more detail?" prompt instead of guessing.
LOW_CONFIDENCE_DISTANCE = 0.6

SYSTEM_PROMPT = (
    "You are Chunga Gava, a civic assistant helping Kenyan citizens understand government policy, "
    "laws, and public documents. Answer strictly using the provided context excerpts. "
    "Whenever you use a fact from an excerpt, explicitly cite its source document by name, "
    "for example: 'According to the Traffic Act...'. "
    "If the context does not contain the answer, say you do not have enough information in the "
    "knowledge base and avoid making up facts."
)

# Whitelisted so a language code never gets injected into the prompt as raw user input.
LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "sw": "Kiswahili (Swahili)",
    "fr": "French",
    "ar": "Arabic",
    "so": "Somali",
}

NO_KB_MESSAGE: dict[str, str] = {
    "en": "I don't have any documents in the knowledge base yet to answer that question.",
    "sw": "Sina hati yoyote kwenye hifadhi ya maarifa bado ya kujibu swali hilo.",
    "fr": "Je n'ai encore aucun document dans la base de connaissances pour répondre à cette question.",
    "ar": "ليس لدي أي مستندات في قاعدة المعرفة بعد للإجابة على هذا السؤال.",
    "so": "Wali ma hayo dukumeenti ku jira kaydka aqoonta si aan ugu jawaabo su'aashaas.",
}


def retrieve_relevant_chunks(db: Session, question: str, top_k: int = TOP_K) -> list[tuple[DocumentChunk, float]]:
    """Semantic search ranks chunks from every uploaded document/category by relevance, which
    is what routes a query to its most-appropriate source (e.g. Traffic Act vs Constitution)
    without needing a separate per-category classifier."""
    query_embedding = embed_query(question)
    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    stmt = select(DocumentChunk, distance).join(KnowledgeDocument).order_by(distance).limit(top_k)
    return [(chunk, dist) for chunk, dist in db.execute(stmt).all()]


def build_context_block(chunks: list[DocumentChunk]) -> str:
    blocks = []
    for chunk in chunks:
        blocks.append(f"[Source: {chunk.document.title} ({chunk.document.category})]\n{chunk.content}")
    return "\n\n---\n\n".join(blocks)


def answer_question(
    db: Session, question: str, history: list[ChatTurn] | None = None, language: str = "en"
) -> tuple[str, list[Citation], bool]:
    results = retrieve_relevant_chunks(db, question)
    if not results:
        return (
            NO_KB_MESSAGE.get(language, NO_KB_MESSAGE["en"]),
            [],
            True,
        )

    chunks = [chunk for chunk, _ in results]
    low_confidence = min(dist for _, dist in results) > LOW_CONFIDENCE_DISTANCE

    context = build_context_block(chunks)
    system_prompt = SYSTEM_PROMPT
    if language != "en":
        language_name = LANGUAGE_NAMES.get(language, "English")
        system_prompt += (
            f" Regardless of what language the question or context excerpts are written in, you "
            f"must write your entire final response only in {language_name}."
        )
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history or []:
        messages.append({"role": "user", "content": turn.question})
        messages.append({"role": "assistant", "content": turn.answer})
    messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"})

    completion = get_openai_client().chat.completions.create(
        model=settings.openai_chat_model,
        messages=messages,
        temperature=0.2,
    )
    answer = completion.choices[0].message.content or ""
    citations = [
        Citation(
            document_title=chunk.document.title,
            category=chunk.document.category,
            excerpt=chunk.content[:280],
        )
        for chunk in chunks
    ]
    return answer, citations, low_confidence


def summarize_feedback(official_or_amenity_name: str, ratings: list[dict]) -> str:
    """Summarize ratings/comments for report dispatch or amenity/expenditure pop-ups. Always
    recomputed from the live ratings table, so a newly submitted rating is reflected the next
    time this is called (e.g. right after the frontend refetches the detail endpoint)."""
    if not ratings:
        return f"No citizen feedback has been recorded for {official_or_amenity_name} in this cycle."

    feedback_lines = "\n".join(
        f"- {r['stars']}/5 stars: {r.get('comment') or '(no comment)'}" for r in ratings
    )
    avg_stars = sum(r["stars"] for r in ratings) / len(ratings)
    try:
        completion = get_openai_client().chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You summarize anonymous citizen feedback about a Kenyan public official or public "
                        "service amenity into a concise, neutral, actionable summary (max 120 words)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Subject: {official_or_amenity_name}\n"
                        f"Average rating: {avg_stars:.1f}/5 across {len(ratings)} ratings.\n"
                        f"Feedback:\n{feedback_lines}"
                    ),
                },
            ],
            temperature=0.3,
        )
        return completion.choices[0].message.content or ""
    except Exception:
        logger.exception("AI feedback summarization failed; falling back to a plain average")
        return f"Average rating for {official_or_amenity_name}: {avg_stars:.1f}/5 across {len(ratings)} ratings."


def translate_short(text: str, language: str) -> str:
    """Best-effort translation for concise outbound SMS text. Returns the original text
    unchanged for English or on any failure, so a translation hiccup never blocks a reply."""
    if language == "en" or not text:
        return text
    language_name = LANGUAGE_NAMES.get(language)
    if not language_name:
        return text
    try:
        completion = get_openai_client().chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Translate the following short message into {language_name}. Keep numbers, "
                        "currency figures, and proper names as-is. Keep it concise. Reply with only "
                        "the translation, no extra commentary."
                    ),
                },
                {"role": "user", "content": text},
            ],
            temperature=0,
        )
        return (completion.choices[0].message.content or text).strip()
    except Exception:
        logger.exception("SMS translation failed; returning original text")
        return text
