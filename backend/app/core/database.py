from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def run_migrations():
    """SQLite 迁移：添加新增列（同步方式，在应用启动时调用）"""
    import sqlite3
    import os

    # 从 DATABASE_URL 解析实际文件路径
    # sqlite+aiosqlite:///./scriptlens.db -> ./scriptlens.db (relative)
    # sqlite+aiosqlite:////data/scriptlens.db -> /data/scriptlens.db (absolute)
    url = settings.DATABASE_URL
    for prefix in ("sqlite+aiosqlite:///", "sqlite:///"):
        if url.startswith(prefix):
            db_path = url[len(prefix):]
            break
    else:
        db_path = "scriptlens.db"

    # 相对路径拼接 CWD，绝对路径保持不变
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)
    db_path = os.path.normpath(db_path)

    if not os.path.exists(db_path):
        return  # 数据库不存在，create_all 会创建完整表结构

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}

        migrations = [
            ("prompt_clean", "TEXT"),
            ("prompt_storyboard", "TEXT"),
        ]
        for col_name, col_type in migrations:
            if col_name not in columns:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"[Migration] Added column: users.{col_name}")

        conn.commit()
    except Exception as e:
        print(f"[Migration] Error: {e}")
        conn.rollback()
    finally:
        conn.close()


async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
