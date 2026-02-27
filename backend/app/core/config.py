"""
Application configuration management.
Uses pydantic-settings to load configuration from environment variables.
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/trading_review_system"

    # CORS - comma separated origins
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Server
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # LLM Configuration (OpenRouter)
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = "deepseek/deepseek-chat-v3-0324"
    LLM_MAX_RETRIES: int = 3
    LLM_TIMEOUT: int = 60
    LLM_MAX_TOKENS: int = 4096

    # Application
    API_VERSION: str = "1.0.0"
    APP_NAME: str = "Trading Review System"

    @property
    def cors_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list of origins."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()
