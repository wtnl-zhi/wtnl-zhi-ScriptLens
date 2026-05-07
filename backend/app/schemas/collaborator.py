from pydantic import BaseModel


class InviteRequest(BaseModel):
    email: str
    role: str = "editor"


class CollaboratorResponse(BaseModel):
    id: str
    user_id: str
    email: str
    name: str
    role: str
    joined_at: str | None = None
