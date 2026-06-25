from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEFAULT_CURRENCY: str = "INR"
    GEMINI_API_KEY: str | None = None

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
