from datetime import datetime

from pydantic import BaseModel


class ShotCreate(BaseModel):
    project_id: str
    shot_number: int
    shot_type: str | None = None
    duration_sec: float | None = None
    content: str | None = None
    atmosphere: str | None = None
    ai_prompt: str | None = None
    script_reference: str | None = None
    notes: str | None = None


class ShotUpdate(BaseModel):
    shot_number: int | None = None
    shot_type: str | None = None
    duration_sec: float | None = None
    content: str | None = None
    atmosphere: str | None = None
    ai_prompt: str | None = None
    script_reference: str | None = None
    reference_image_url: str | None = None
    notes: str | None = None
    sort_order: int | None = None


class ShotResponse(BaseModel):
    id: str
    project_id: str
    shot_number: int
    shot_type: str | None
    duration_sec: float | None
    content: str | None
    atmosphere: str | None
    ai_prompt: str | None
    script_reference: str | None
    reference_image_url: str | None
    notes: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateRequest(BaseModel):
    project_id: str
    model: str = "flash"


class GenerateResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    status: str  # processing / completed / failed
    progress: int = 0
    error: str | None = None


class ReorderItem(BaseModel):
    id: str
    sort_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]
