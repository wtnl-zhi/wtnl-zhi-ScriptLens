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
    scene_name: str | None = None
    characters: str | None = None
    location: str | None = None
    props: str | None = None


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
    scene_name: str | None = None
    characters: str | None = None
    location: str | None = None
    props: str | None = None
    shooting_order: int | None = None
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
    scene_name: str | None
    characters: str | None
    location: str | None
    props: str | None
    shooting_order: int | None
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
    status: str
    progress: int = 0
    error: str | None = None


class ReorderItem(BaseModel):
    id: str
    sort_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]


class OptimizeRequest(BaseModel):
    project_id: str
    field: str = "content"  # content or ai_prompt
    model: str = "flash"


class ShootingSummaryRequest(BaseModel):
    project_id: str
    model: str = "flash"
