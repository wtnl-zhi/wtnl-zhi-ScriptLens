from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate
from app.schemas.storyboard import ShotResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count_q = select(func.count(Project.id)).where(Project.user_id == current_user.id, Project.deleted_at.is_(None))
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(Project)
        .where(Project.user_id == current_user.id, Project.deleted_at.is_(None))
        .order_by(Project.updated_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(q)
    projects = result.scalars().all()

    return ProjectListResponse(items=projects, total=total)


@router.post("", response_model=ProjectResponse)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(user_id=current_user.id, title=body.title, description=body.description, source_text=body.source_text)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Project)
        .options(selectinload(Project.shots))
        .where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    )
    result = await db.execute(q)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "project": ProjectResponse.model_validate(project),
        "shots": [ShotResponse.model_validate(s) for s in project.shots],
    }


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Project).where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    result = await db.execute(q)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.title is not None:
        project.title = body.title
    if body.description is not None:
        project.description = body.description
    if body.status is not None:
        project.status = body.status
    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Project).where(Project.id == project_id, Project.user_id == current_user.id, Project.deleted_at.is_(None))
    result = await db.execute(q)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Project deleted"}
