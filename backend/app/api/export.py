import io
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.services.export_service import export_csv, export_excel, export_images_zip, export_pdf
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["export"])


async def get_project_for_user(project_id: str, user_id: str, db: AsyncSession) -> Project:
    q = (
        select(Project)
        .options(selectinload(Project.shots))
        .where(Project.id == project_id, Project.user_id == user_id, Project.deleted_at.is_(None))
    )
    result = await db.execute(q)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/excel")
async def export_excel_endpoint(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(project_id, current_user.id, db)
    filepath = export_excel(project, project.shots)
    filename = f"{project.title}_分镜表.xlsx"
    return FileResponse(
        filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/{project_id}/csv")
async def export_csv_endpoint(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(project_id, current_user.id, db)
    filepath = export_csv(project, project.shots)

    with open(filepath, "r", encoding="utf-8-sig") as f:
        content = f.read()

    filename = f"{project.title}_分镜表.csv"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.get("/{project_id}/pdf")
async def export_pdf_endpoint(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(project_id, current_user.id, db)
    
    if not project.shots:
        raise HTTPException(status_code=400, detail="暂无分镜数据，无法导出PDF")
    
    buffer = export_pdf(project, project.shots)
    filename = f"{project.title}_分镜表.pdf"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.get("/{project_id}/images")
async def export_images_endpoint(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(project_id, current_user.id, db)
    filepath = export_images_zip(project.shots)
    filename = f"{project.title}_参考图片.zip"
    return FileResponse(
        filepath,
        filename=filename,
        media_type="application/zip",
    )
