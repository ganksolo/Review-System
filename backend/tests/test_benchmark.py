"""
Performance benchmark tests — verify query performance with indexes
and measure throughput for bulk operations.

对应 database-schema spec:
- Task 17.2: 性能基准测试
"""

import time
import pytest
from uuid import uuid4

from app.services.trade_service import TradeService
from app.schemas.trade import (
    TradeCreate, TradeFilters, PaginationParams, SortParams,
)
from tests.conftest import make_trade_data

USER_ID = f"bench-{uuid4().hex[:6]}"
pytestmark = pytest.mark.asyncio(loop_scope="session")


class TestBulkInsertPerformance:
    """批量插入性能基准"""

    async def test_bulk_insert_50_records(self, db_session):
        """50 条记录的批量插入应在 5 秒内完成"""
        svc = TradeService(db_session)
        trades_data = [
            TradeCreate(**make_trade_data(stock_code=f"PERF{i:04d}"))
            for i in range(50)
        ]

        start = time.monotonic()
        successes, failures = await svc.bulk_create_trades(USER_ID, trades_data)
        elapsed = time.monotonic() - start

        assert len(successes) == 50
        assert len(failures) == 0
        assert elapsed < 5.0, f"Bulk insert of 50 records took {elapsed:.2f}s (> 5s)"


class TestQueryPerformance:
    """查询性能基准"""

    async def test_paginated_query_under_500ms(self, db_session):
        """分页查询应在 500ms 内返回"""
        svc = TradeService(db_session)

        start = time.monotonic()
        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(),
            PaginationParams(page=1, page_size=20),
            SortParams(),
        )
        elapsed = time.monotonic() - start

        assert elapsed < 0.5, f"Paginated query took {elapsed:.3f}s (> 500ms)"

    async def test_filtered_query_under_500ms(self, db_session):
        """带过滤条件的查询应在 500ms 内返回"""
        svc = TradeService(db_session)

        start = time.monotonic()
        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(stock_code="PERF0001"),
            PaginationParams(page=1, page_size=20),
            SortParams(),
        )
        elapsed = time.monotonic() - start

        assert elapsed < 0.5, f"Filtered query took {elapsed:.3f}s (> 500ms)"

    async def test_sorted_query_under_500ms(self, db_session):
        """排序查询应在 500ms 内返回"""
        svc = TradeService(db_session)

        start = time.monotonic()
        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(),
            PaginationParams(page=1, page_size=50),
            SortParams(sort_by="entry_date", order="asc"),
        )
        elapsed = time.monotonic() - start

        assert elapsed < 0.5, f"Sorted query took {elapsed:.3f}s (> 500ms)"


class TestSingleRecordPerformance:
    """单条记录操作性能"""

    async def test_create_single_under_200ms(self, db_session):
        """创建单条记录应在 200ms 内完成"""
        svc = TradeService(db_session)

        start = time.monotonic()
        trade = await svc.create_trade(
            USER_ID, TradeCreate(**make_trade_data()),
        )
        elapsed = time.monotonic() - start

        assert trade.id is not None
        assert elapsed < 0.2, f"Single create took {elapsed:.3f}s (> 200ms)"

    async def test_get_by_id_under_100ms(self, db_session):
        """按 ID 查询应在 100ms 内完成（利用主键索引）"""
        svc = TradeService(db_session)
        trade = await svc.create_trade(
            USER_ID, TradeCreate(**make_trade_data()),
        )

        start = time.monotonic()
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        elapsed = time.monotonic() - start

        assert fetched.id == trade.id
        assert elapsed < 0.1, f"Get by ID took {elapsed:.3f}s (> 100ms)"

    async def test_update_under_200ms(self, db_session):
        """更新单条记录应在 200ms 内完成"""
        svc = TradeService(db_session)
        trade = await svc.create_trade(
            USER_ID, TradeCreate(**make_trade_data()),
        )

        from app.schemas.trade import TradeUpdate

        start = time.monotonic()
        updated = await svc.update_trade(
            USER_ID, trade.id,
            TradeUpdate(version=1, exit_price=99.0),
        )
        elapsed = time.monotonic() - start

        assert updated.version == 2
        assert elapsed < 0.2, f"Update took {elapsed:.3f}s (> 200ms)"
