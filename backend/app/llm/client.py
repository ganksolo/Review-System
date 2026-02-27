"""
LLM Client — OpenRouter/OpenAI-compatible API client.

Uses the openai SDK pointing to OpenRouter's endpoint.
Supports retry with exponential backoff.
"""

import logging
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Provider-agnostic LLM client using OpenAI SDK (compatible with OpenRouter)."""

    def __init__(self):
        self.client = AsyncOpenAI(
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
    ) -> Dict[str, Any]:
        """
        Send a chat completion request.

        Returns:
            {
                "content": str,
                "usage": {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int},
                "model": str,
                "finish_reason": str,
            }
        """
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": self.max_tokens,
        }

        if response_format:
            kwargs["response_format"] = response_format

        logger.info("LLM request: model=%s, messages=%d", self.model, len(messages))

        response = await self.client.chat.completions.create(**kwargs)

        choice = response.choices[0]
        usage = response.usage

        result = {
            "content": choice.message.content or "",
            "usage": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "total_tokens": usage.total_tokens if usage else 0,
            },
            "model": response.model or self.model,
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
