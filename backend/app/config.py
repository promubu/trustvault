from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./trustvault_dev.db"
    secret_key: str = "development-only-change-me"
    upload_dir: str = "./uploads"
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

settings = Settings()
