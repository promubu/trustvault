from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./trustvault_dev.db"
    secret_key: str = "development-only-change-me"
    upload_dir: str = "./uploads"
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"
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
