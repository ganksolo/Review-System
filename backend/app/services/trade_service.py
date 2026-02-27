"""
Trade Service — Business logic layer for trade CRUD and rules queries.

负责:
  - 交易记录的创建、查询、更新、软删除、恢复
  - PnL 自动计算
  - 乐观锁并发控制
  - 规则库（永久排除、正确行为、环境错配）查询
"""

import math
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    BusinessValidationError,
    OptimisticLockError,
    TradeNotFoundError,
)
from app.models.enums import ErrorLevel, PnLFlag, ResultType
from app.models.trade import Trade
from app.schemas.trade import (
    PaginationParams,
    SortParams,
    TradeCreate,
    TradeFilters,
    TradeUpdate,
)


class TradeService:
    """交易记录业务逻辑服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CRUD ────────────────────────────────────────────────────────

    async def create_trade(self, user_id: str, data: TradeCreate) -> Trade:
        """
        创建交易记录。
        自动计算 PnL、设置 pnl_flag。
        """
        trade = Trade(
            user_id=user_id,
            **data.model_dump(),
        )
        self.calculate_pnl(trade)
        self.db.add(trade)
        await self.db.flush()
        await self.db.refresh(trade)
        return trade

    async def get_trades(
        self,
        user_id: str,
        filters: TradeFilters,
        pagination: PaginationParams,
        sort: SortParams,
    ) -> Tuple[List[Trade], int]:
        """
        查询交易列表。
        自动排除软删除记录，支持多条件过滤、分页、排序。
        返回 (records, total_count)。
        """
        # 基础查询：排除软删除
        stmt = select(Trade).where(
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
        )

        # 应用过滤条件 (AND 逻辑)
        stmt = self._apply_filters(stmt, filters)

        # 查询总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # 排序
        sort_column = getattr(Trade, sort.sort_by, Trade.entry_date)
        if sort.order == "desc":
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # 分页
        offset = (pagination.page - 1) * pagination.page_size
        stmt = stmt.offset(offset).limit(pagination.page_size)

        result = await self.db.execute(stmt)
        trades = list(result.scalars().all())
        return trades, total

    async def get_trade_by_id(self, user_id: str, trade_id: UUID) -> Trade:
        """
        获取单条交易记录。
        排除已软删除的记录，不存在则抛出 TradeNotFoundError。
        """
        stmt = select(Trade).where(
            Trade.id == trade_id,
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        trade = result.scalar_one_or_none()
        if not trade:
            raise TradeNotFoundError(trade_id)
        return trade

    async def update_trade(
        self, user_id: str, trade_id: UUID, data: TradeUpdate
    ) -> Trade:
        """
        乐观锁更新。
        version 不匹配则抛出 OptimisticLockError。
        更新后自动重算 PnL。
        """
        # 查找记录（包含 version 匹配检查）
        stmt = select(Trade).where(
            Trade.id == trade_id,
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        trade = result.scalar_one_or_none()

        if not trade:
            raise TradeNotFoundError(trade_id)

        # 乐观锁检查
        if trade.version != data.version:
            raise OptimisticLockError(
                expected=data.version, actual=trade.version
            )

        # 应用更新（只更新非 None 字段）
        update_data = data.model_dump(exclude_unset=True, exclude={"version"})
        for field, value in update_data.items():
            setattr(trade, field, value)

        # 重算 PnL
        self.calculate_pnl(trade)

        await self.db.flush()
        await self.db.refresh(trade)
        return trade

    async def soft_delete_trade(self, user_id: str, trade_id: UUID) -> None:
        """软删除交易记录"""
        trade = await self.get_trade_by_id(user_id, trade_id)
        trade.soft_delete()
        await self.db.flush()

    async def restore_trade(self, user_id: str, trade_id: UUID) -> Trade:
        """恢复已软删除的交易记录"""
        # 查找已删除的记录
        stmt = select(Trade).where(
            Trade.id == trade_id,
            Trade.user_id == user_id,
            Trade.deleted_at.is_not(None),
        )
        result = await self.db.execute(stmt)
        trade = result.scalar_one_or_none()
        if not trade:
            raise TradeNotFoundError(trade_id)

        trade.restore()
        await self.db.flush()
        await self.db.refresh(trade)
        return trade

    async def bulk_create_trades(
        self, user_id: str, data_list: List[TradeCreate]
    ) -> Tuple[List[Trade], List[Dict]]:
        """
        批量创建交易记录。
        每条记录独立验证，返回 (successes, failures)。
        """
        successes: List[Trade] = []
        failures: List[Dict] = []

        for idx, data in enumerate(data_list):
            try:
                trade = Trade(user_id=user_id, **data.model_dump())
                self.calculate_pnl(trade)
                self.db.add(trade)
                await self.db.flush()
                await self.db.refresh(trade)
                successes.append(trade)
            except Exception as e:
                failures.append(
                    {"index": idx, "error": str(e), "data": data.model_dump()}
                )

        return successes, failures

    # ── PnL 计算 ───────────────────────────────────────────────────

    def calculate_pnl(self, trade: Trade) -> None:
        """
        计算 pnl_amount, pnl_ratio, pnl_flag。
        公式:
          pnl_amount = (exit_price - entry_price) * position_size - slippage
          pnl_ratio = pnl_amount / (entry_price * position_size) * 100
        """
        if trade.exit_price and trade.entry_price and trade.position_size:
            slippage = trade.slippage or 0.0
            trade.pnl_amount = (
                (trade.exit_price - trade.entry_price)
                * trade.position_size
                - slippage
            )
            denominator = trade.entry_price * trade.position_size
            if denominator > 0:
                trade.pnl_ratio = (trade.pnl_amount / denominator) * 100
            else:
                trade.pnl_ratio = 0.0

            # pnl_flag 由 Trade 模型的 @validates('pnl_amount') 自动设置

    # ── 规则库查询 ──────────────────────────────────────────────────

    async def get_permanent_exclusions(self, user_id: str) -> List[Trade]:
        """永久排除清单 — permanent_exclusion_flag=true"""
        stmt = select(Trade).where(
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
            Trade.permanent_exclusion_flag.is_(True),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_correct_behaviors(self, user_id: str) -> List[Trade]:
        """正确行为清单 — result_type=正确盈利"""
        stmt = select(Trade).where(
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
            Trade.result_type == ResultType.CORRECT_PROFIT,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_environment_mismatches(self, user_id: str) -> List[Trade]:
        """环境错配提醒 — environment_mismatch_flag=true"""
        stmt = select(Trade).where(
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
            Trade.environment_mismatch_flag.is_(True),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_rules_summary(self, user_id: str) -> Dict:
        """规则库汇总统计"""
        base = select(func.count()).where(
            Trade.user_id == user_id,
            Trade.deleted_at.is_(None),
        )

        total = (
            await self.db.execute(base)
        ).scalar() or 0

        exclusions = (
            await self.db.execute(
                base.where(Trade.permanent_exclusion_flag.is_(True))
            )
        ).scalar() or 0

        correct = (
            await self.db.execute(
                base.where(Trade.result_type == ResultType.CORRECT_PROFIT)
            )
        ).scalar() or 0

        mismatches = (
            await self.db.execute(
                base.where(Trade.environment_mismatch_flag.is_(True))
            )
        ).scalar() or 0

        exec_errors = (
            await self.db.execute(
                base.where(Trade.error_level == ErrorLevel.EXECUTION_ERROR)
            )
        ).scalar() or 0

        pattern_errors = (
            await self.db.execute(
                base.where(Trade.error_level == ErrorLevel.PATTERN_ERROR)
            )
        ).scalar() or 0

        env_errors = (
            await self.db.execute(
                base.where(Trade.error_level == ErrorLevel.ENVIRONMENT_ERROR)
            )
        ).scalar() or 0

        return {
            "total_trades": total,
            "permanent_exclusions_count": exclusions,
            "correct_behaviors_count": correct,
            "environment_mismatches_count": mismatches,
            "execution_errors_count": exec_errors,
            "pattern_errors_count": pattern_errors,
            "environment_errors_count": env_errors,
        }

    # ── 内部工具方法 ────────────────────────────────────────────────

    @staticmethod
    def _apply_filters(stmt, filters: TradeFilters):
        """将过滤条件应用到查询语句（AND 逻辑）"""
        if filters.stock_code:
            stmt = stmt.where(Trade.stock_code == filters.stock_code)
        if filters.start_date:
            stmt = stmt.where(Trade.entry_date >= filters.start_date)
        if filters.end_date:
            stmt = stmt.where(Trade.entry_date <= filters.end_date)
        if filters.market_environment:
            stmt = stmt.where(
                Trade.market_environment == filters.market_environment
            )
        if filters.result_type:
            stmt = stmt.where(Trade.result_type == filters.result_type)
        if filters.pnl_flag:
            stmt = stmt.where(Trade.pnl_flag == filters.pnl_flag)
        if filters.account_type:
            stmt = stmt.where(Trade.account_type == filters.account_type)
        if filters.trade_cycle:
            stmt = stmt.where(Trade.trade_cycle == filters.trade_cycle)
        return stmt
