from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.project_collaborator import ProjectCollaborator
from app.models.user import User
from app.api.auth import get_current_user


async def get_project_with_permission(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    require_role: str | None = None,
) -> Project:
    """Get a project with permission check.
    
    Args:
        project_id: The project ID
        current_user: The current user
        db: Database session
        require_role: If 'editor' or 'owner', checks user has at least that role
    
    Returns:
        The project with shots eager loaded
    """
    q = (
        select(Project)
        .options(selectinload(Project.shots), selectinload(Project.collaborators))
        .where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    result = await db.execute(q)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check ownership
    if project.user_id == current_user.id:
        return project

    # Check collaborator
    collab_q = select(ProjectCollaborator).where(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == current_user.id,
    )
    collab_result = await db.execute(collab_q)
    collab = collab_result.scalar_one_or_none()

    if not collab:
        raise HTTPException(status_code=403, detail="Access denied")

    if require_role == "owner" and collab.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    if require_role == "editor" and collab.role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Editor access required")

    return project
