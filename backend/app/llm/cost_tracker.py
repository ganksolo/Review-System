"""
Token usage and cost tracking for LLM calls.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List

logger = logging.getLogger(__name__)

# Approximate cost per 1M tokens (USD) — adjust for your OpenRouter plan
MODEL_COSTS = {
    "deepseek/deepseek-chat-v3-0324": {"input": 0.5, "output": 1.5},
    "default": {"input": 1.0, "output": 3.0},
}


class CostTracker:
    """In-memory token usage and cost tracker."""

    def __init__(self):
        self.records: List[Dict] = []

    def record(self, usage: Dict, model: str) -> None:
        """Record a single LLM call's token usage."""
        costs = MODEL_COSTS.get(model, MODEL_COSTS["default"])
        prompt_cost = (usage.get("prompt_tokens", 0) / 1_000_000) * costs["input"]
        completion_cost = (usage.get("completion_tokens", 0) / 1_000_000) * costs["output"]

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": model,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "cost_usd": round(prompt_cost + completion_cost, 6),
        }
        self.records.append(entry)
        logger.info(
            "LLM cost: %d tokens, $%.6f (%s)",
            entry["total_tokens"],
            entry["cost_usd"],
            model,
        )

    def get_summary(self) -> Dict:
        """Return usage summary."""
        total_tokens = sum(r["total_tokens"] for r in self.records)
        total_cost = sum(r["cost_usd"] for r in self.records)
        return {
            "total_calls": len(self.records),
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 6),
            "records": self.records[-20:],  # Last 20 calls
        }


# Module-level singleton
cost_tracker = CostTracker()
