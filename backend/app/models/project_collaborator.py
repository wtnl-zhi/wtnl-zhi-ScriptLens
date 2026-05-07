import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProjectCollaborator(Base):
    __tablename__ = "project_collaborators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="editor")  # owner / editor / viewer
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="collaborators")
    user = relationship("User")
