from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.storyboard_shot import StoryboardShot
from app.models.user import User
from app.schemas.storyboard import (
    GenerateRequest,
    GenerateResponse,
    ReorderRequest,
    ShotCreate,
    ShotResponse,
    ShotUpdate,
    TaskStatusResponse,
)
from app.services.encryption import decrypt_value
from app.services.task_manager import create_task, get_task
from app.services.deepseek import clean_script
from app.core.config import settings
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/storyboard", tags=["storyboard"])


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.shots))
        .where(Project.id == body.project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key = None
    if current_user.encrypted_deepseek_key:
        try:
            api_key = decrypt_value(current_user.encrypted_deepseek_key, settings.ENCRYPTION_KEY)
        except Exception:
            pass

    task_id = create_task(
        "generate",
        project_id=body.project_id,
        script_text=project.source_text or "",
        model=body.model,
        api_key=api_key,
        custom_prompt_json=current_user.prompt_storyboard,
    )
    return {"task_id": task_id}


@router.post("/clean")
async def clean(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    text = body.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    api_key = None
    if current_user.encrypted_deepseek_key:
        try:
            api_key = decrypt_value(current_user.encrypted_deepseek_key, settings.ENCRYPTION_KEY)
        except Exception:
            pass

    if not api_key:
        raise HTTPException(status_code=400, detail="请在设置页配置 DeepSeek API Key 后使用智能清洗")

    cleaned = clean_script(text, api_key, current_user.prompt_clean)
    return {"cleaned_text": cleaned}


@router.get("/status/{task_id}")
async def get_task_status(task_id: str) -> TaskStatusResponse:
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusResponse(
        status=task["status"],
        progress=task.get("progress", 0),
        error=task.get("error"),
    )


@router.get("/results/{task_id}")
async def get_task_results(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task not completed yet")

    project_id = task.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="Task has no associated project")

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.shots))
        .where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "shots": [ShotResponse.model_validate(s) for s in project.shots],
    }


# ---- Batch Optimize ----

@router.post("/batch-optimize")
async def batch_optimize(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project_id = body.get("project_id")
    field = body.get("field", "content")

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key = None
    if current_user.encrypted_deepseek_key:
        try:
            api_key = decrypt_value(current_user.encrypted_deepseek_key, settings.ENCRYPTION_KEY)
        except Exception:
            pass
    if not api_key:
        raise HTTPException(status_code=400, detail="请在设置页配置 DeepSeek API Key")

    task_id = create_task("optimize", project_id=project_id, field=field, api_key=api_key)
    return {"task_id": task_id}


# ---- Shooting Summary ----

@router.post("/shooting-summary")
async def generate_shooting_summary_endpoint(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project_id = body.get("project_id")

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key = None
    if current_user.encrypted_deepseek_key:
        try:
            api_key = decrypt_value(current_user.encrypted_deepseek_key, settings.ENCRYPTION_KEY)
        except Exception:
            pass
    if not api_key:
        raise HTTPException(status_code=400, detail="请在设置页配置 DeepSeek API Key")

    task_id = create_task("shooting_summary", project_id=project_id, api_key=api_key)
    return {"task_id": task_id}


@router.get("/shooting-summary/{project_id}")
async def get_shooting_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"summary": project.shooting_summary}


@router.put("/shots/{shot_id}", response_model=ShotResponse)
async def update_shot(
    shot_id: str,
    body: ShotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StoryboardShot)
        .join(Project)
        .where(StoryboardShot.id == shot_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(shot, key, value)
    await db.flush()
    await db.refresh(shot)
    return shot


@router.post("/shots", response_model=ShotResponse)
async def add_shot(
    body: ShotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    shot = StoryboardShot(**body.model_dump())
    db.add(shot)
    await db.flush()
    await db.refresh(shot)
    return shot


@router.delete("/shots/{shot_id}")
async def delete_shot(
    shot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StoryboardShot)
        .join(Project)
        .where(StoryboardShot.id == shot_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")
    await db.delete(shot)
    await db.flush()
    return {"message": "Shot deleted"}


@router.put("/reorder")
async def reorder(
    body: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for item in body.items:
        result = await db.execute(
            select(StoryboardShot)
            .join(Project)
            .where(StoryboardShot.id == item.id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
        )
        shot = result.scalar_one_or_none()
        if shot:
            shot.sort_order = item.sort_order
    await db.flush()

    if body.items:
        first_result = await db.execute(select(StoryboardShot).where(StoryboardShot.id == body.items[0].id))
        first_shot = first_result.scalar_one_or_none()
        if first_shot:
            q = (
                select(StoryboardShot)
                .where(StoryboardShot.project_id == first_shot.project_id)
                .order_by(StoryboardShot.sort_order)
            )
            result = await db.execute(q)
            all_shots = result.scalars().all()
            for idx, shot in enumerate(all_shots, start=1):
                shot.shot_number = idx

    await db.commit()
    return {"message": "Reorder successful"}
