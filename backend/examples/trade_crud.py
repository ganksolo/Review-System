"""
示例: 使用 TradeService 进行交易记录 CRUD 操作。

运行前提:
  1. PostgreSQL 数据库已启动，且已创建对应数据库
  2. 环境变量 DATABASE_URL 已设置
  3. 已执行 `alembic upgrade head`
"""

import asyncio
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.enums import PnLFlag
from app.schemas.trade import (
    TradeCreate,
    TradeFilters,
    TradeUpdate,
    PaginationParams,
    SortParams,
)
from app.services.trade_service import TradeService

DATABASE_URL = "postgresql+asyncpg://localhost:5432/trading_review_system"
USER_ID = "demo-user"


async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        svc = TradeService(session)

        # 1. 创建交易记录
        trade = await svc.create_trade(USER_ID, TradeCreate(
            account_type="短线账户",
            stock_code="000001",
            stock_name="平安银行",
            trade_cycle="短线",
            entry_date="2026-01-10T09:30:00",
            exit_date="2026-01-12T14:00:00",
            entry_price=12.50,
            exit_price=13.10,
            position_size=10,
            correct_action="按计划执行，在关键位置止盈",
            market_environment="牛市-主升",
            thesis_statement="看好银行板块年初行情",
        ))
        print(f"创建成功: id={trade.id}, PnL={trade.pnl_amount}, flag={trade.pnl_flag}")

        # 2. 查询交易记录
        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(stock_code="000001"),
            PaginationParams(page=1, page_size=10),
            SortParams(sort_by="entry_date", order="desc"),
        )
        print(f"查询结果: {total} 条记录")
        for t in trades:
            print(f"  - {t.stock_code} {t.stock_name} PnL={t.pnl_amount}")

        # 3. 更新交易记录 (乐观锁)
        updated = await svc.update_trade(
            USER_ID, trade.id,
            TradeUpdate(version=trade.version, exit_price=14.00),
        )
        print(f"更新成功: version={updated.version}, 新PnL={updated.pnl_amount}")

        # 4. 软删除与恢复
        await svc.soft_delete_trade(USER_ID, trade.id)
        print("已软删除")

        restored = await svc.restore_trade(USER_ID, trade.id)
        print(f"已恢复: deleted_at={restored.deleted_at}")

        # 5. 批量创建
        batch = [
            TradeCreate(
                account_type="短线账户",
                stock_code=f"60000{i}",
                trade_cycle="短线",
                entry_date="2026-02-01T09:30:00",
                entry_price=10.0 + i,
                exit_price=11.0 + i,
                position_size=100,
                correct_action=f"批量测试记录 {i}",
            )
            for i in range(3)
        ]
        successes, failures = await svc.bulk_create_trades(USER_ID, batch)
        print(f"批量创建: 成功={len(successes)}, 失败={len(failures)}")

        # 6. 规则库查询
        summary = await svc.get_rules_summary(USER_ID)
        print(f"规则库汇总: {summary}")

        await session.commit()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
