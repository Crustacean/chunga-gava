from pydantic import BaseModel


class ActiveVoteOut(BaseModel):
    target_id: int
    rating_type: str

    model_config = {"from_attributes": True}
