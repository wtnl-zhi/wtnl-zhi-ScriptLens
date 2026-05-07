from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.api.auth import get_current_user
from app.services.permission import get_project_with_permission
from app.models.storyboard_shot import StoryboardShot
from app.models.project import Project

router = APIRouter(prefix="/api/storyboard/shots/{shot_id}/comments", tags=["comments"])


@router.get("")
async def list_comments(
    shot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify shot exists and user has access
    result = await db.execute(
        select(StoryboardShot).join(Project).where(StoryboardShot.id == shot_id, Project.deleted_at.is_(None))
    )
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    # Check permission
    try:
        await get_project_with_permission(shot.project_id, current_user, db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="Access denied")

    q = (
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.shot_id == shot_id)
        .order_by(Comment.created_at.asc())
    )
    result = await db.execute(q)
    comments = result.scalars().all()

    return {
        "items": [
            {
                "id": c.id,
                "shot_id": c.shot_id,
                "user_id": c.user_id,
                "user_name": c.user.name if c.user else "",
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comments
        ]
    }


@router.post("")
async def create_comment(
    shot_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StoryboardShot).join(Project).where(StoryboardShot.id == shot_id, Project.deleted_at.is_(None))
    )
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    try:
        await get_project_with_permission(shot.project_id, current_user, db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="Access denied")

    content = (body.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content required")

    comment = Comment(shot_id=shot_id, user_id=current_user.id, content=content)
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    await db.refresh(comment, ["user"])

    return {
        "id": comment.id,
        "shot_id": comment.shot_id,
        "user_id": comment.user_id,
        "user_name": current_user.name,
        "content": comment.content,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


@router.delete("/{comment_id}")
async def delete_comment(
    shot_id: str,
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.shot_id == shot_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete others' comments")

    await db.delete(comment)
    await db.flush()
    return {"message": "Comment deleted"}
