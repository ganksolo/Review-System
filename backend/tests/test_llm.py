"""
Tests for LLM analysis module.

对应 spec:
- llm-analysis 7.1: Mock LLM Client 单元测试
- llm-analysis 7.2: Prompt 模板测试
- llm-analysis 7.3: 结构化解析测试
- llm-analysis 7.4: 分析流程集成测试 (with mock)
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.llm.schemas import LLMAnalysisResult
from app.llm.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.llm.cost_tracker import CostTracker


# ── LLM Schemas (7.3) ────────────────────────────────────────────

class TestLLMAnalysisResult:

    def test_valid_result(self):
        result = LLMAnalysisResult(
            result_type="正确盈利",
            error_level=None,
            environment_mismatch=False,
            permanent_exclusion=False,
            action_items=["继续保持纪律"],
            long_term_insights=["优化仓位管理"],
            thesis_analysis="买入论点合理",
            cognitive_biases=[],
            confidence_score=0.85,
            reasoning="分析过程说明",
        )
        assert result.result_type == "正确盈利"
        assert result.confidence_score == 0.85

    def test_loss_result_with_error_level(self):
        result = LLMAnalysisResult(
            result_type="执行亏损",
            error_level="执行层错误",
            environment_mismatch=True,
            permanent_exclusion=False,
            action_items=["严格止损", "控制FOMO"],
            long_term_insights=["建立交易系统"],
            thesis_analysis="买入论点存在缺陷",
            cognitive_biases=["FOMO", "确认偏误"],
            confidence_score=0.92,
            reasoning="推理过程",
        )
        assert result.error_level == "执行层错误"
        assert len(result.cognitive_biases) == 2

    def test_confidence_score_range(self):
        with pytest.raises(ValidationError):
            LLMAnalysisResult(
                result_type="正确盈利",
                environment_mismatch=False,
                permanent_exclusion=False,
                action_items=[],
                long_term_insights=[],
                thesis_analysis="test",
                confidence_score=1.5,  # > 1
                reasoning="test",
            )

    def test_parse_json_string(self):
        """从 JSON 字符串解析"""
        raw = json.dumps({
            "result_type": "模式亏损",
            "error_level": "模式层错误",
            "environment_mismatch": False,
            "permanent_exclusion": False,
            "action_items": ["改进模式识别"],
            "long_term_insights": ["学习新策略"],
            "thesis_analysis": "模式错误分析",
            "cognitive_biases": [],
            "confidence_score": 0.7,
            "reasoning": "详细推理",
        })
        result = LLMAnalysisResult.model_validate_json(raw)
        assert result.result_type == "模式亏损"


# ── Prompt Templates (7.2) ───────────────────────────────────────

class TestPrompts:

    def test_system_prompt_contains_rules(self):
        assert "result_type" in SYSTEM_PROMPT
        assert "正确盈利" in SYSTEM_PROMPT
        assert "JSON" in SYSTEM_PROMPT

    def test_build_analysis_prompt(self):
        trade_data = {
            "stock_code": "000001",
            "stock_name": "平安银行",
            "entry_price": 12.50,
            "exit_price": 13.10,
            "pnl_amount": 60.0,
            "pnl_ratio": 4.8,
            "market_environment": "牛市-主升",
            "thesis_statement": "看好银行板块",
            "correct_action": "按计划执行",
        }
        prompt = build_analysis_prompt(trade_data)
        assert "000001" in prompt
        assert "平安银行" in prompt
        assert "12.5" in prompt
        assert "JSON" in prompt

    def test_prompt_handles_missing_data(self):
        prompt = build_analysis_prompt({})
        assert "?" in prompt  # Missing values show ?
        assert "未填写" in prompt  # Optional fields show 未填写


# ── Cost Tracker (7.1 via mock) ──────────────────────────────────

class TestCostTracker:

    def test_record_and_summary(self):
        tracker = CostTracker()
        tracker.record(
            {"prompt_tokens": 500, "completion_tokens": 200, "total_tokens": 700},
            "deepseek/deepseek-chat-v3-0324",
        )
        summary = tracker.get_summary()
        assert summary["total_calls"] == 1
        assert summary["total_tokens"] == 700
        assert summary["total_cost_usd"] > 0

    def test_multiple_records(self):
        tracker = CostTracker()
        for _ in range(5):
            tracker.record(
                {"prompt_tokens": 100, "completion_tokens": 100, "total_tokens": 200},
                "deepseek/deepseek-chat-v3-0324",
            )
        summary = tracker.get_summary()
        assert summary["total_calls"] == 5
        assert summary["total_tokens"] == 1000


# ── LLM Client Mock Tests (7.1) ─────────────────────────────────

class TestLLMClientMock:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_health_check_mocked(self):
        from app.llm.client import LLMClient

        client = LLMClient()

        # Build a mock response object
        mock_choice = type("Choice", (), {
            "message": type("Msg", (), {"content": "OK"})(),
            "finish_reason": "stop",
        })()
        mock_usage = type("Usage", (), {
            "prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7,
        })()
        mock_response = type("Response", (), {
            "choices": [mock_choice],
            "usage": mock_usage,
            "model": "test-model",
        })()

        async def mock_create(**kwargs):
            return mock_response

        with patch.object(
            client.client.chat.completions, "create",
            side_effect=mock_create,
        ):
            ok = await client.health_check()
            assert ok is True
