from pydantic import BaseModel


class ServiceClassCreate(BaseModel):
    name: str
    color: str


class ServiceClassUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class ServiceClassOut(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}
