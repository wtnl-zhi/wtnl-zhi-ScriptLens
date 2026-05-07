from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, collaborators, comments, export, health, projects, storyboard, upload, versions
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="ScriptLens API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(storyboard.router)
app.include_router(upload.router)
app.include_router(export.router)
app.include_router(collaborators.router)
app.include_router(comments.router)
app.include_router(versions.router)

import os
upload_dir = settings.UPLOAD_DIR
os.makedirs(upload_dir, exist_ok=True)
os.makedirs(os.path.join(upload_dir, "images"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
