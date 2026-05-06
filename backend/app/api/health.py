from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import async_session_factory

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "database": db_status}
