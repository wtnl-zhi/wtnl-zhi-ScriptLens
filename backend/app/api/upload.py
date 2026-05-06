import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.services.parser import parse_document

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR = UPLOAD_DIR / "images"
IMAGE_DIR.mkdir(exist_ok=True)


async def get_user_id(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    authorization: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    await get_user_id(authorization)

    ext = os.path.splitext(file.filename or "image.png")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"):
        raise HTTPException(status_code=400, detail="Unsupported image format")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = IMAGE_DIR / filename

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"url": f"/uploads/images/{filename}", "filename": filename}


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    authorization: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    await get_user_id(authorization)

    ext = os.path.splitext(file.filename or "document.txt")[1].lower()
    if ext not in (".txt", ".pdf", ".docx", ".xlsx"):
        raise HTTPException(status_code=400, detail="Unsupported document format")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    text = parse_document(str(filepath))
    return {"text": text, "filename": filename}


@router.delete("/image/{filename}")
async def delete_image(
    filename: str,
    authorization: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    await get_user_id(authorization)

    filepath = IMAGE_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    os.remove(filepath)
    return {"message": "Image deleted"}
