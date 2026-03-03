"""
Pydantic schemas for LLM Config API.
"""

from typing import Optional

from pydantic import BaseModel, field_validator


class LLMConfigRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None

    @field_validator("provider")
    @classmethod
    def provider_valid(cls, v: str) -> str:
        allowed = {"openai", "deepseek", "anthropic", "gemini", "custom"}
        v = v.strip().lower()
        if v not in allowed:
            raise ValueError(f"provider 必须是 {', '.join(sorted(allowed))} 之一")
        return v

    @field_validator("api_key")
    @classmethod
    def api_key_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("API Key 不能为空")
        return v.strip()


class LLMConfigUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None

    @field_validator("provider")
    @classmethod
    def provider_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"openai", "deepseek", "anthropic", "gemini", "custom"}
        v = v.strip().lower()
        if v not in allowed:
            raise ValueError(f"provider 必须是 {', '.join(sorted(allowed))} 之一")
        return v


class LLMConfigResponse(BaseModel):
    id: str
    provider: str
    masked_key: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
