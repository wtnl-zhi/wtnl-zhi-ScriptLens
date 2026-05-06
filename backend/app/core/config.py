from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./scriptlens.db"
    JWT_SECRET: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    DEEPSEEK_API_KEY: str | None = None
    UPLOAD_DIR: str = "./uploads"
    ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef"
    ENV: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
