from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import decode_access_token
from app.models.storyboard_shot import StoryboardShot
from app.models.project import Project
from app.models.user import User
from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(
    ws: WebSocket,
    project_id: str,
    token: str = Query(...),
):
    # Authenticate via token
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        await ws.close(code=4001)
        return

    user_id = payload["sub"]

    # Verify project access
    async with async_session_factory() as db:
        result = await db.execute(
            select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
        )
        project = result.scalar_one_or_none()
        if not project:
            await ws.close(code=4004)
            return

        if project.user_id != user_id:
            from app.models.project_collaborator import ProjectCollaborator
            collab = await db.execute(
                select(ProjectCollaborator).where(
                    ProjectCollaborator.project_id == project_id,
                    ProjectCollaborator.user_id == user_id,
                )
            )
            if not collab.scalar_one_or_none():
                await ws.close(code=4003)
                return

    await manager.connect(project_id, ws)

    # Send online count to everyone
    count = manager.get_online_count(project_id)
    await manager.broadcast(project_id, {"type": "online_count", "count": count})

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "edit_shot":
                shot_id = data.get("shot_id")
                updates = data.get("updates", {})

                async with async_session_factory() as db:
                    shot_result = await db.execute(
                        select(StoryboardShot).where(StoryboardShot.id == shot_id)
                    )
                    shot = shot_result.scalar_one_or_none()
                    if shot:
                        for key, value in updates.items():
                            if hasattr(shot, key):
                                setattr(shot, key, value)
                        await db.commit()

                await manager.broadcast(project_id, {
                    "type": "shot_updated",
                    "shot_id": shot_id,
                    "updates": updates,
                    "user_id": user_id,
                }, exclude=ws)

            elif msg_type == "add_shot":
                shot_data = data.get("shot", {})
                async with async_session_factory() as db:
                    shot = StoryboardShot(
                        project_id=project_id,
                        shot_number=shot_data.get("shot_number", 1),
                        shot_type=shot_data.get("shot_type"),
                        duration_sec=shot_data.get("duration_sec"),
                        content=shot_data.get("content"),
                        atmosphere=shot_data.get("atmosphere"),
                        ai_prompt=shot_data.get("ai_prompt"),
                        script_reference=shot_data.get("script_reference"),
                        sort_order=shot_data.get("sort_order", 1),
                    )
                    db.add(shot)
                    await db.commit()
                    await db.refresh(shot)
                    shot_id = shot.id

                await manager.broadcast(project_id, {
                    "type": "shot_added",
                    "shot": {
                        "id": shot_id,
                        "project_id": project_id,
                        "shot_number": shot.shot_number,
                        "shot_type": shot.shot_type,
                        "duration_sec": shot.duration_sec,
                        "content": shot.content,
                        "atmosphere": shot.atmosphere,
                        "ai_prompt": shot.ai_prompt,
                        "script_reference": shot.script_reference,
                        "sort_order": shot.sort_order,
                    },
                    "user_id": user_id,
                }, exclude=ws)

            elif msg_type == "delete_shot":
                shot_id = data.get("shot_id")
                async with async_session_factory() as db:
                    shot = await db.execute(
                        select(StoryboardShot).where(StoryboardShot.id == shot_id)
                    )
                    shot = shot.scalar_one_or_none()
                    if shot:
                        await db.delete(shot)
                        await db.commit()

                await manager.broadcast(project_id, {
                    "type": "shot_deleted",
                    "shot_id": shot_id,
                    "user_id": user_id,
                }, exclude=ws)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(project_id, ws)
        count = manager.get_online_count(project_id)
        await manager.broadcast(project_id, {"type": "online_count", "count": count})
