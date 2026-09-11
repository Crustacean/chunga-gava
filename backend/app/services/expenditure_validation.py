import json
import logging

from app.core.config import get_settings
from app.schemas.expenditure import ExpenditureValidationRequest, ExpenditureValidationResponse
from app.services.embeddings import get_openai_client

settings = get_settings()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You review Kenyan county public-infrastructure spending records for plausibility, "
    "reasoning the way an analyst comparing a submission against publicly published Kenyan "
    "National Treasury budget data (e.g. the kind of per-project figures published via "
    "https://bajetiyetu.treasury.go.ke) would. You are not fetching live data - use your general "
    "knowledge of typical Kenyan public-sector costs for the given category. Flag a submission "
    "only if its budget figures are implausible or inconsistent with typical costs for that "
    "category and spec (e.g. a wildly inflated cost-per-kilometer for a road, or spend "
    "exceeding allocation). Respond with strict JSON: "
    '{"is_valid": boolean, "warnings": [short strings]}. If nothing looks wrong, return '
    '{"is_valid": true, "warnings": []}.'
)


def _rule_based_warnings(payload: ExpenditureValidationRequest) -> list[str]:
    warnings = []
    if payload.budget_spent > payload.budget_allocated:
        warnings.append(
            f"Budget spent (KES {payload.budget_spent:,.0f}) exceeds budget allocated "
            f"(KES {payload.budget_allocated:,.0f})."
        )
    if payload.budget_allocated <= 0:
        warnings.append("Budget allocated must be greater than zero.")
    return warnings


def validate_expenditure_record(payload: ExpenditureValidationRequest) -> ExpenditureValidationResponse:
    warnings = _rule_based_warnings(payload)

    if settings.openai_api_key:
        try:
            completion = get_openai_client().chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Category: {payload.category}\n"
                            f"Spec: {payload.spec_label or 'n/a'} = {payload.spec_value or 'n/a'}\n"
                            f"Budget allocated: KES {payload.budget_allocated:,.0f}\n"
                            f"Budget spent: KES {payload.budget_spent:,.0f}"
                        ),
                    },
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            content = completion.choices[0].message.content or "{}"
            parsed = json.loads(content)
            warnings.extend(w for w in parsed.get("warnings", []) if w not in warnings)
        except Exception:
            logger.exception("AI expenditure validation failed; falling back to rule-based checks only")

    return ExpenditureValidationResponse(is_valid=len(warnings) == 0, warnings=warnings)
