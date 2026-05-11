import asyncio
import json
import threading
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.project import Project
from app.models.storyboard_shot import StoryboardShot
from app.services.deepseek import generate_storyboard
from app.services.optimize import batch_optimize_shots, generate_shooting_summary

_tasks: dict[str, dict] = {}
_lock = threading.Lock()


def create_task(task_type: str, project_id: str, **kwargs) -> str:
    task_id = str(uuid.uuid4())
    with _lock:
        _tasks[task_id] = {
            "id": task_id,
            "project_id": project_id,
            "type": task_type,
            "status": "processing",
            "progress": 0,
            "error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    if task_type == "generate":
        args = (task_id, project_id, kwargs.get("script_text", ""), kwargs.get("model", "flash"), kwargs.get("api_key"))
        thread = threading.Thread(target=_run_generation, args=args, daemon=True)
    elif task_type == "optimize":
        args = (task_id, project_id, kwargs.get("field", "content"), kwargs.get("api_key"))
        thread = threading.Thread(target=_run_optimize, args=args, daemon=True)
    elif task_type == "shooting_summary":
        args = (task_id, project_id, kwargs.get("api_key"))
        thread = threading.Thread(target=_run_shooting_summary, args=args, daemon=True)
    else:
        raise ValueError(f"Unknown task type: {task_type}")

    thread.start()
    return task_id


def _run_generation(task_id: str, project_id: str, script_text: str, model: str, api_key: str | None) -> None:
    try:
        _update_task(task_id, {"progress": 10})
        shots_data = generate_storyboard(script_text, model, api_key)
        _update_task(task_id, {"progress": 60})
        asyncio.run(_save_shots(task_id, project_id, shots_data))
    except Exception as e:
        _update_task(task_id, {"status": "failed", "error": str(e)})


def _run_optimize(task_id: str, project_id: str, field: str, api_key: str | None) -> None:
    try:
        _update_task(task_id, {"progress": 10})
        asyncio.run(_do_optimize(task_id, project_id, field, api_key))
    except Exception as e:
        _update_task(task_id, {"status": "failed", "error": str(e)})


def _run_shooting_summary(task_id: str, project_id: str, api_key: str | None) -> None:
    try:
        _update_task(task_id, {"progress": 10})
        asyncio.run(_do_shooting_summary(task_id, project_id, api_key))
    except Exception as e:
        _update_task(task_id, {"status": "failed", "error": str(e)})


async def _save_shots(task_id: str, project_id: str, shots_data: list[dict]) -> None:
    async with async_session_factory() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            _update_task(task_id, {"status": "failed", "error": "Project not found"})
            return

        existing = await db.execute(select(StoryboardShot).where(StoryboardShot.project_id == project_id))
        for s in existing.scalars().all():
            await db.delete(s)

        for i, data in enumerate(shots_data):
            shot = StoryboardShot(
                project_id=project_id, shot_number=i + 1,
                shot_type=data.get("shot_type"), duration_sec=data.get("duration_sec"),
                content=data.get("content"), atmosphere=data.get("atmosphere"),
                ai_prompt=data.get("ai_prompt"), script_reference=data.get("script_reference"),
                sort_order=i + 1,
            )
            db.add(shot)

        await db.commit()
        _update_task(task_id, {"status": "completed", "progress": 100})


async def _do_optimize(task_id: str, project_id: str, field: str, api_key: str | None) -> None:
    if not api_key:
        _update_task(task_id, {"status": "failed", "error": "请在设置页配置 DeepSeek API Key"})
        return

    async with async_session_factory() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            _update_task(task_id, {"status": "failed", "error": "Project not found"})
            return

        shots_result = await db.execute(
            select(StoryboardShot).where(StoryboardShot.project_id == project_id).order_by(StoryboardShot.sort_order)
        )
        shots = shots_result.scalars().all()
        if not shots:
            _update_task(task_id, {"status": "failed", "error": "No shots to optimize"})
            return

        _update_task(task_id, {"progress": 30})
        shots_data = [{
            "id": s.id, "shot_number": s.shot_number, "shot_type": s.shot_type,
            "content": s.content, "atmosphere": s.atmosphere, "ai_prompt": s.ai_prompt,
            "script_reference": s.script_reference,
        } for s in shots]

        _update_task(task_id, {"progress": 50})
        optimized = batch_optimize_shots(shots_data, field, api_key)

        _update_task(task_id, {"progress": 80})
        for opt in optimized:
            opt_id = opt.get("id")
            if not opt_id:
                continue
            for s in shots:
                if s.id == opt_id and field in opt:
                    setattr(s, field, opt[field])

        await db.commit()
        _update_task(task_id, {"status": "completed", "progress": 100})


async def _do_shooting_summary(task_id: str, project_id: str, api_key: str | None) -> None:
    if not api_key:
        _update_task(task_id, {"status": "failed", "error": "请在设置页配置 DeepSeek API Key"})
        return

    async with async_session_factory() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            _update_task(task_id, {"status": "failed", "error": "Project not found"})
            return

        shots_result = await db.execute(
            select(StoryboardShot).where(StoryboardShot.project_id == project_id).order_by(StoryboardShot.sort_order)
        )
        shots = shots_result.scalars().all()
        if not shots:
            _update_task(task_id, {"status": "failed", "error": "No shots"})
            return

        _update_task(task_id, {"progress": 30})
        shots_data = [{
            "shot_number": s.shot_number, "shot_type": s.shot_type, "duration_sec": s.duration_sec,
            "content": s.content, "atmosphere": s.atmosphere, "ai_prompt": s.ai_prompt,
            "script_reference": s.script_reference,
            "scene_name": s.scene_name, "characters": s.characters,
            "location": s.location, "props": s.props,
        } for s in shots]

        _update_task(task_id, {"progress": 50})
        summary = generate_shooting_summary(shots_data, api_key)

        _update_task(task_id, {"progress": 80})
        project.shooting_summary = summary
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
