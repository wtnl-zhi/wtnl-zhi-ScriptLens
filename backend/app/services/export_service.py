import csv
import os
import tempfile
import zipfile
from pathlib import Path

from app.core.config import settings


def export_excel(project, shots) -> str:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = "分镜表"

    headers = ["镜头号", "镜头类型", "时长(秒)", "画面描述", "氛围", "对应脚本", "AI提示词", "备注"]
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, shot in enumerate(shots, 2):
        ws.cell(row=row_idx, column=1, value=shot.shot_number)
        ws.cell(row=row_idx, column=2, value=shot.shot_type or "")
        ws.cell(row=row_idx, column=3, value=shot.duration_sec or "")
        ws.cell(row=row_idx, column=4, value=shot.content or "")
        ws.cell(row=row_idx, column=5, value=shot.atmosphere or "")
        ws.cell(row=row_idx, column=6, value=shot.script_reference or "")
        ws.cell(row=row_idx, column=7, value=shot.ai_prompt or "")
        ws.cell(row=row_idx, column=8, value=shot.notes or "")

    for col in range(1, len(headers) + 1):
        ws.column_dimensions[chr(64 + col)].width = 25

    filepath = os.path.join(settings.UPLOAD_DIR, f"export_{project.id}.xlsx")
    wb.save(filepath)
    return filepath


def export_csv(project, shots) -> str:
    filepath = os.path.join(settings.UPLOAD_DIR, f"export_{project.id}.csv")
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["镜头号", "镜头类型", "时长(秒)", "画面描述", "氛围", "对应脚本", "AI提示词", "备注"])
        for shot in shots:
            writer.writerow([
                shot.shot_number,
                shot.shot_type or "",
                shot.duration_sec or "",
                shot.content or "",
                shot.atmosphere or "",
                shot.script_reference or "",
                shot.ai_prompt or "",
                shot.notes or "",
            ])
    return filepath


def export_images_zip(shots) -> str:
    filepath = os.path.join(settings.UPLOAD_DIR, f"images_{id(shots)}.zip")
    with zipfile.ZipFile(filepath, "w", zipfile.ZIP_DEFLATED) as zf:
        for shot in shots:
            if shot.reference_image_url:
                img_path = shot.reference_image_url.lstrip("/")
                full_path = os.path.join(settings.UPLOAD_DIR, "..", img_path)
                if os.path.exists(full_path):
                    zf.write(full_path, os.path.basename(full_path))
    return filepath
