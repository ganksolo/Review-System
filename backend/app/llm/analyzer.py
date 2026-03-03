"""
Core trade analysis engine — orchestrates LLM calls and updates trade records.
"""

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.client import llm_client, resolve_llm_config
from app.llm.cost_tracker import cost_tracker
from app.llm.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.llm.schemas import LLMAnalysisResult
from app.models.trade import Trade

logger = logging.getLogger(__name__)


class TradeAnalyzer:
    """核心分析引擎：构建 prompt → 调用 LLM → 解析结果 → 更新 Trade。"""

    async def analyze_trade(
        self, db: AsyncSession, trade_id: UUID, *, force: bool = False,
        user_id: Optional[str] = None,
    ) -> Optional[LLMAnalysisResult]:
        """
        分析单条交易记录。

        流程：
        1. 查找交易记录
        2. 设置 llm_analysis_status = Processing
        3. 构建 prompt 并调用 LLM
        4. 解析结构化输出
        5. 更新交易记录字段
        6. 设置 llm_analysis_status = Completed / Failed
        """
        stmt = select(Trade).where(Trade.id == trade_id, Trade.deleted_at.is_(None))
        if user_id:
            stmt = stmt.where(Trade.user_id == user_id)
        result = await db.execute(stmt)
        trade = result.scalar_one_or_none()

        if not trade:
            logger.warning("Trade not found for analysis: %s", trade_id)
            return None

        # ── Cache check: skip if already analyzed with identical trade data ──
        trade_data = self._build_trade_data(trade)
        current_hash = self._compute_trade_hash(trade_data)

        if (
            not force
            and trade.llm_analysis_status is not None
            and trade.llm_analysis_status.value == "Completed"
            and trade.llm_raw_log
            and trade.llm_raw_log.get("trade_data_hash") == current_hash
        ):
            logger.info(
                "Skipping re-analysis for trade %s (cache hit, hash=%s)",
                trade_id, current_hash[:12],
            )
            return None

        # 2. 标记为处理中
        trade.start_llm_analysis()
        await db.flush()

        try:
            # 3. 构建 prompt
            user_prompt = build_analysis_prompt(trade_data)

            # 3.5 解析用户级 LLM 配置 (DB → env → error)
            llm_config = None
            try:
                llm_config = await resolve_llm_config(db, user_id)
            except Exception as cfg_err:
                logger.warning("LLM config resolve failed, using default: %s", cfg_err)

            # 4. 调用 LLM
            llm_response = await llm_client.chat(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                config=llm_config,
            )

            # 5. 记录成本
            cost_tracker.record(llm_response["usage"], llm_response["model"])

            # 6. 解析结构化输出
            content = llm_response["content"]
            parsed = LLMAnalysisResult.model_validate_json(content)

            # 7. 更新交易记录
            self._apply_result(trade, parsed)

            # 8. 存储原始日志 + 标记完成
            raw_log = {
                "request": {"model": llm_response["model"], "trade_id": str(trade_id)},
                "response": json.loads(content),
                "usage": llm_response["usage"],
                "trade_data_hash": current_hash,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
            }
            trade.complete_llm_analysis(raw_log)
            await db.flush()
            await db.refresh(trade)

            logger.info("Analysis completed for trade %s: %s", trade_id, parsed.result_type)
            return parsed

        except Exception as e:
            logger.error("Analysis failed for trade %s: %s", trade_id, e, exc_info=True)
            trade.fail_llm_analysis({
                "error": str(e),
                "failed_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.flush()
            return None

    async def analyze_batch(
        self,
        db: AsyncSession,
        trade_ids: List[UUID],
        max_concurrent: int = 3,
        user_id: Optional[str] = None,
    ) -> List[Tuple[UUID, Optional[LLMAnalysisResult]]]:
        """
        批量分析多条交易记录（并行 + 信号量限流）。
        每个并发任务使用独立 db session，避免 asyncpg 单连接并发冲突。
        """
        from app.db.session import AsyncSessionLocal

        semaphore = asyncio.Semaphore(max_concurrent)

        async def _analyze_one(tid: UUID) -> Tuple[UUID, Optional[LLMAnalysisResult]]:
            async with semaphore:
                async with AsyncSessionLocal() as session:
                    try:
                        r = await self.analyze_trade(session, tid, user_id=user_id)
                        await session.commit()
                        return (tid, r)
                    except Exception:
                        await session.rollback()
                        return (tid, None)

        tasks = [_analyze_one(tid) for tid in trade_ids]
        gathered = await asyncio.gather(*tasks)
        return list(gathered)

    def _build_trade_data(self, trade: Trade) -> dict:
        """Extract trade fields into a dict for prompt building and cache hashing."""
        return {
            "stock_code": trade.stock_code,
            "stock_name": trade.stock_name or "",
            "account_type": trade.account_type.value if trade.account_type else "",
            "trade_cycle": trade.trade_cycle.value if trade.trade_cycle else "",
            "entry_price": trade.entry_price,
            "exit_price": trade.exit_price,
            "position_size": trade.position_size,
            "pnl_amount": trade.pnl_amount,
            "pnl_ratio": trade.pnl_ratio,
            "market_environment": trade.market_environment.value if trade.market_environment else None,
            "sector_status": trade.sector_status.value if trade.sector_status else None,
            "selection_dimension": trade.selection_dimension or [],
            "strategy_pattern": trade.strategy_pattern or [],
            "thesis_statement": trade.thesis_statement,
            "plan_adherence": trade.plan_adherence.value if trade.plan_adherence else None,
            "stop_loss_discipline": trade.stop_loss_discipline.value if trade.stop_loss_discipline else None,
            "exit_type": trade.exit_type.value if trade.exit_type else None,
            "exit_reason": trade.exit_reason,
            "psychological_state": trade.psychological_state.value if trade.psychological_state else None,
            "correct_action": trade.correct_action,
        }

    @staticmethod
    def _compute_trade_hash(trade_data: dict) -> str:
        """Compute SHA256 hash of trade data for cache comparison."""
        serialized = json.dumps(trade_data, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode()).hexdigest()

    def _apply_result(self, trade: Trade, result: LLMAnalysisResult) -> None:
        """将 LLM 分析结果应用到 Trade 模型字段。"""
        from app.models.enums import ErrorLevel, ResultType

        # result_type
        type_map = {
            "正确盈利": ResultType.CORRECT_PROFIT,
            "运气盈利": ResultType.LUCKY_PROFIT,
            "执行亏损": ResultType.EXECUTION_LOSS,
            "模式亏损": ResultType.PATTERN_LOSS,
        }
        if result.result_type in type_map:
            trade.result_type = type_map[result.result_type]

        # error_level
        level_map = {
            "执行层错误": ErrorLevel.EXECUTION_ERROR,
            "模式层错误": ErrorLevel.PATTERN_ERROR,
            "环境层错误": ErrorLevel.ENVIRONMENT_ERROR,
        }
        if result.error_level and result.error_level in level_map:
            trade.error_level = level_map[result.error_level]
        else:
            trade.error_level = None

        # flags
        trade.environment_mismatch_flag = result.environment_mismatch
        trade.permanent_exclusion_flag = result.permanent_exclusion

        # action item (concatenate into single string)
        trade.llm_action_item = " | ".join(result.action_items) if result.action_items else None


# Module-level singleton
trade_analyzer = TradeAnalyzer()
