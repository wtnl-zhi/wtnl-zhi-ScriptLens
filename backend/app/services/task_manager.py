import asyncio
import threading
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.project import Project
from app.models.storyboard_shot import StoryboardShot
from app.services.deepseek import generate_storyboard

_tasks: dict[str, dict] = {}
_lock = threading.Lock()


def create_task(project_id: str, script_text: str, model: str, api_key: str | None = None) -> str:
    task_id = str(uuid.uuid4())
    with _lock:
        _tasks[task_id] = {
            "id": task_id,
            "project_id": project_id,
            "status": "processing",
            "progress": 0,
            "error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    thread = threading.Thread(
        target=_run_generation,
        args=(task_id, project_id, script_text, model, api_key),
        daemon=True,
    )
    thread.start()
    return task_id


def _run_generation(
    task_id: str, project_id: str, script_text: str, model: str, api_key: str | None
) -> None:
    try:
        _update_task(task_id, {"progress": 10})
        shots_data = generate_storyboard(script_text, model, api_key)
        _update_task(task_id, {"progress": 60})

        asyncio.run(_save_shots(task_id, project_id, shots_data))
    except Exception as e:
        _update_task(task_id, {"status": "failed", "error": str(e)})


async def _save_shots(task_id: str, project_id: str, shots_data: list[dict]) -> None:
    async with async_session_factory() as db:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            _update_task(task_id, {"status": "failed", "error": "Project not found"})
            return

        existing = await db.execute(
            select(StoryboardShot).where(StoryboardShot.project_id == project_id)
        )
        existing_shots = existing.scalars().all()
        existing_count = len(existing_shots)

        for i, data in enumerate(shots_data):
            shot = StoryboardShot(
                project_id=project_id,
                shot_number=existing_count + i + 1,
                shot_type=data.get("shot_type"),
                duration_sec=data.get("duration_sec"),
                content=data.get("content"),
                atmosphere=data.get("atmosphere"),
                ai_prompt=data.get("ai_prompt"),
                script_reference=data.get("script_reference"),
                sort_order=existing_count + i + 1,
            )
            db.add(shot)

        await db.commit()
        _update_task(task_id, {"status": "completed", "progress": 100})


def _update_task(task_id: str, updates: dict) -> None:
    with _lock:
        task = _tasks.get(task_id)
        if task:
            task.update(updates)


def get_task(task_id: str) -> dict | None:
    with _lock:
        task = _tasks.get(task_id)
        return task.copy() if task else None
