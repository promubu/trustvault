import os
import tempfile
from pydantic_settings import BaseSettings, SettingsConfigDict

def _default_upload_dir() -> str:
    # If running in Vercel or AWS Lambda serverless, default to writable /tmp
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return os.path.join(tempfile.gettempdir(), "uploads")
    return "./uploads"

def _default_database_url() -> str:
    # If running in Vercel or AWS Lambda serverless without DATABASE_URL, fallback to /tmp SQLite
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = os.path.join(tempfile.gettempdir(), "trustvault_dev.db").replace("\\", "/")
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./trustvault_dev.db"

class Settings(BaseSettings):
    database_url: str = _default_database_url()
    secret_key: str = "development-only-change-me"
    upload_dir: str = _default_upload_dir()
    cors_origins: str = "http://localhost:5173,https://trustvault-brown.vercel.app,https://trustvault-frontend.vercel.app"
    environment: str = "development"
    auto_seed_demo: bool = True
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    @property
    def normalized_database_url(self) -> str:
        url = self.database_url.strip()
        # Normalize postgres:// to postgresql+psycopg://
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://"):]
        # Normalize postgresql:// to postgresql+psycopg:// for SQLAlchemy 2 with psycopg 3
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            return "postgresql+psycopg://" + url[len("postgresql://"):]
        return url

    @property
    def safe_database_url(self) -> str:
        """Returns the database URL with any password masked to prevent credential leakage."""
        try:
            from sqlalchemy.engine import make_url
            return make_url(self.normalized_database_url).render_as_string(hide_password=True)
        except Exception:
            return "redacted"

settings = Settings()
