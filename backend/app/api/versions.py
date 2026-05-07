import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.project_version import ProjectVersion
from app.models.storyboard_shot import StoryboardShot
from app.models.user import User
from app.schemas.storyboard import ShotResponse
from app.api.auth import get_current_user
from app.services.permission import get_project_with_permission

router = APIRouter(prefix="/api/projects/{project_id}/versions", tags=["versions"])


@router.post("/save")
async def save_version(
    project_id: str,
    body: dict | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_with_permission(project_id, current_user, db, require_role="editor")

    q = select(func.max(ProjectVersion.version_number)).where(ProjectVersion.project_id == project_id)
    max_ver = (await db.execute(q)).scalar() or 0

    result = await db.execute(
        select(StoryboardShot).where(StoryboardShot.project_id == project_id).order_by(StoryboardShot.sort_order)
    )
    shots = result.scalars().all()
    snapshot = json.dumps([
        {
            "shot_number": s.shot_number,
            "shot_type": s.shot_type,
            "duration_sec": s.duration_sec,
            "content": s.content,
            "atmosphere": s.atmosphere,
            "ai_prompt": s.ai_prompt,
            "script_reference": s.script_reference,
            "sort_order": s.sort_order,
        }
        for s in shots
    ], ensure_ascii=False)

    version = ProjectVersion(
        project_id=project_id,
        version_number=max_ver + 1,
        shots_snapshot=snapshot,
    )
    db.add(version)
    await db.flush()
    await db.refresh(version)

    return {
        "id": version.id,
        "version_number": version.version_number,
        "shot_count": len(shots),
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }


@router.get("")
async def list_versions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_with_permission(project_id, current_user, db)

    q = (
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version_number.desc())
    )
    result = await db.execute(q)
    versions = result.scalars().all()

    return {
        "items": [
            {
                "id": v.id,
                "version_number": v.version_number,
                "shot_count": len(json.loads(v.shots_snapshot)),
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ]
    }


@router.post("/{version_id}/restore")
async def restore_version(
    project_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_with_permission(project_id, current_user, db, require_role="editor")

    result = await db.execute(
        select(ProjectVersion).where(ProjectVersion.id == version_id, ProjectVersion.project_id == project_id)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    shots_data = json.loads(version.shots_snapshot)

    result = await db.execute(
        select(StoryboardShot).where(StoryboardShot.project_id == project_id)
    )
    existing = result.scalars().all()
    for shot in existing:
        await db.delete(shot)
    await db.flush()

    for data in shots_data:
        shot = StoryboardShot(
            project_id=project_id,
            shot_number=data["shot_number"],
            shot_type=data.get("shot_type"),
            duration_sec=data.get("duration_sec"),
            content=data.get("content"),
            atmosphere=data.get("atmosphere"),
            ai_prompt=data.get("ai_prompt"),
            script_reference=data.get("script_reference"),
            sort_order=data.get("sort_order", data["shot_number"]),
        )
        db.add(shot)
    await db.flush()

    return {"message": "Version restored", "shot_count": len(shots_data)}
