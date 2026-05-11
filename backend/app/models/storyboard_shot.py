import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StoryboardShot(Base):
    __tablename__ = "storyboard_shots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    shot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    shot_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    atmosphere: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ai_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    script_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    scene_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    characters: Mapped[str | None] = mapped_column(String(300), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    props: Mapped[str | None] = mapped_column(String(500), nullable=True)
    shooting_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="shots")
    comments = relationship("Comment", back_populates="shot", cascade="all, delete-orphan")
