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
)
from app.services.deepseek import generate_storyboard
from app.services.encryption import decrypt_value
from app.core.config import settings
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/storyboard", tags=["storyboard"])


@router.post("/generate", response_model=GenerateResponse)
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

    shots_data = generate_storyboard(project.source_text or "", body.model, api_key)
    await db.flush()

    existing_count = len(project.shots)
    shot_responses = []
    for i, data in enumerate(shots_data):
        shot = StoryboardShot(
            project_id=project.id,
            shot_number=existing_count + i + 1,
            shot_type=data.get("shot_type"),
            duration_sec=data.get("duration_sec"),
            content=data.get("content"),
            atmosphere=data.get("atmosphere"),
            ai_prompt=data.get("ai_prompt"),
            sort_order=existing_count + i + 1,
        )
        db.add(shot)
        await db.flush()
        await db.refresh(shot)
        shot_responses.append(ShotResponse.model_validate(shot))

    return GenerateResponse(shots=shot_responses)


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
            await db.flush()

    return {"message": "Reorder successful"}
