"""
LLM Client — OpenRouter/OpenAI-compatible API client.

Uses the openai SDK pointing to OpenRouter's endpoint.
Supports retry with exponential backoff.
Supports dynamic per-user config from DB with fallback to env vars.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMClientConfig:
    api_key: str
    base_url: str
    model: str
    max_tokens: int = 4096
    timeout: int = 60
    max_retries: int = 3
    source: str = "env"


async def resolve_llm_config(db: AsyncSession, user_id: Optional[str] = None) -> LLMClientConfig:
    """
    Resolve LLM config: DB (user-level) → env vars → error.
    """
    if user_id and db:
        try:
            from app.core.encryption import get_encryptor
            from app.models.llm_config import LLMConfig

            stmt = select(LLMConfig).where(
                LLMConfig.user_id == user_id,
                LLMConfig.is_active.is_(True),
            )
            cfg = (await db.execute(stmt)).scalar_one_or_none()
            if cfg:
                encryptor = get_encryptor()
                if encryptor:
                    api_key = encryptor.decrypt(cfg.encrypted_key)
                    return LLMClientConfig(
                        api_key=api_key,
                        base_url=cfg.base_url or settings.LLM_API_BASE,
                        model=cfg.model_name or settings.LLM_MODEL,
                        max_tokens=settings.LLM_MAX_TOKENS,
                        timeout=settings.LLM_TIMEOUT,
                        max_retries=settings.LLM_MAX_RETRIES,
                        source="db",
                    )
        except Exception as e:
            logger.warning("Failed to load DB LLM config for user %s: %s", user_id, e)

    if settings.LLM_API_KEY:
        return LLMClientConfig(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE,
            model=settings.LLM_MODEL,
            max_tokens=settings.LLM_MAX_TOKENS,
            timeout=settings.LLM_TIMEOUT,
            max_retries=settings.LLM_MAX_RETRIES,
            source="env",
        )

    raise RuntimeError("LLM 未配置：请在 UI 中配置 API Key 或设置环境变量 LLM_API_KEY")


def create_openai_client(cfg: LLMClientConfig) -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=cfg.api_key,
        base_url=cfg.base_url,
        timeout=cfg.timeout,
        max_retries=cfg.max_retries,
    )


class LLMClient:
    """Provider-agnostic LLM client using OpenAI SDK (compatible with OpenRouter)."""

    def __init__(self):
        self._default_client: Optional[AsyncOpenAI] = None
        if settings.LLM_API_KEY:
            self._default_client = AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_API_BASE,
                timeout=settings.LLM_TIMEOUT,
                max_retries=settings.LLM_MAX_RETRIES,
            )
        self.model = settings.LLM_MODEL
        self.max_tokens = settings.LLM_MAX_TOKENS

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        response_format: Optional[Dict[str, Any]] = None,
        config: Optional[LLMClientConfig] = None,
    ) -> Dict[str, Any]:
        """
        Send a chat completion request.

        If config is provided, creates a temporary client with those settings.
        Otherwise falls back to the default env-based client.
        """
        if config:
            client = create_openai_client(config)
            model = config.model
            max_tokens = config.max_tokens
        elif self._default_client:
            client = self._default_client
            model = self.model
            max_tokens = self.max_tokens
        else:
            raise RuntimeError("LLM 未配置：请设置 API Key")

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_format:
            kwargs["response_format"] = response_format

        logger.info("LLM request: model=%s, messages=%d, source=%s",
                     model, len(messages), config.source if config else "env")

        response = await client.chat.completions.create(**kwargs)

        choice = response.choices[0]
        usage = response.usage

        result = {
            "content": choice.message.content or "",
            "usage": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "total_tokens": usage.total_tokens if usage else 0,
            },
            "model": response.model or model,
            "finish_reason": choice.finish_reason or "unknown",
        }

        logger.info(
            "LLM response: tokens=%d, finish=%s",
            result["usage"]["total_tokens"],
            result["finish_reason"],
        )

        return result

    async def health_check(self) -> bool:
        """Quick health check — send a minimal request."""
        try:
            result = await self.chat(
                messages=[{"role": "user", "content": "回复OK"}],
                temperature=0,
            )
            return bool(result.get("content"))
        except Exception as e:
            logger.error("LLM health check failed: %s", e)
            return False


# Module-level singleton
llm_client = LLMClient()
