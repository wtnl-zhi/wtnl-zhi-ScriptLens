from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str = "未命名项目"
    description: str | None = None
    source_text: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str | None
    status: str
    source_text: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
