from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.project_collaborator import ProjectCollaborator
from app.models.user import User
from app.schemas.collaborator import CollaboratorResponse, InviteRequest
from app.api.auth import get_current_user
from app.services.permission import get_project_with_permission

router = APIRouter(prefix="/api/projects/{project_id}/collaborators", tags=["collaborators"])


@router.get("/")
async def list_collaborators(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_with_permission(project_id, current_user, db)
    q = (
        select(ProjectCollaborator)
        .options(selectinload(ProjectCollaborator.user))
        .where(ProjectCollaborator.project_id == project_id)
    )
    result = await db.execute(q)
    collabs = result.scalars().all()

    owner_result = await db.execute(select(User).where(User.id == project.user_id))
    owner = owner_result.scalar_one_or_none()

    items = [
        {
            "id": collab.id,
            "user_id": collab.user_id,
            "email": collab.user.email if collab.user else "",
            "name": collab.user.name if collab.user else "",
            "role": collab.role,
            "joined_at": collab.joined_at.isoformat() if collab.joined_at else None,
        }
        for collab in collabs
    ]
    if owner:
        items.insert(0, {
            "id": "owner",
            "user_id": owner.id,
            "email": owner.email,
            "name": owner.name,
            "role": "owner",
            "joined_at": None,
        })

    return {"items": items}


@router.post("/invite")
async def invite_collaborator(
    project_id: str,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only owner/editor can invite
    project = await get_project_with_permission(project_id, current_user, db, require_role="editor")

    # Find user by email
    result = await db.execute(select(User).where(User.email == body.email))
    invited_user = result.scalar_one_or_none()
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")

    if invited_user.id == project.user_id:
        raise HTTPException(status_code=400, detail="Cannot invite the project owner")

    # Check if already a collaborator
    existing = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == invited_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a collaborator")

    collab = ProjectCollaborator(
        project_id=project_id,
        user_id=invited_user.id,
        role=body.role or "editor",
    )
    db.add(collab)
    await db.flush()
    await db.refresh(collab)

    return {"message": "Invitation sent", "collaborator_id": collab.id}


@router.put("/{collaborator_id}/role")
async def update_collaborator_role(
    project_id: str,
    collaborator_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only owner can change roles
    await get_project_with_permission(project_id, current_user, db, require_role="owner")

    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.id == collaborator_id,
            ProjectCollaborator.project_id == project_id,
        )
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    new_role = body.get("role")
    if new_role not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")

    collab.role = new_role
    await db.flush()
    return {"message": "Role updated"}


@router.delete("/{collaborator_id}")
async def remove_collaborator(
    project_id: str,
    collaborator_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_with_permission(project_id, current_user, db, require_role="owner")

    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.id == collaborator_id,
            ProjectCollaborator.project_id == project_id,
        )
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    await db.delete(collab)
    await db.flush()
    return {"message": "Collaborator removed"}
