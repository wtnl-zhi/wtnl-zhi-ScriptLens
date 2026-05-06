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
from app.services.export_service import export_csv, export_excel, export_images_zip
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

    buffer = io.BytesIO()
    buffer.write(b"%PDF-1.4\n")
    buffer.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    buffer.write(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    buffer.write(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n")
    buffer.write(b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n")
    buffer.seek(0)

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
