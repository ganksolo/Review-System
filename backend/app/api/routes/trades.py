"""
Trades API router — CRUD operations for trade records.

Endpoints:
  POST   /api/trades              创建单条交易记录
  POST   /api/trades/bulk         批量创建
  GET    /api/trades              查询列表（过滤+分页+排序）
  GET    /api/trades/{id}         获取单条记录
  PUT    /api/trades/{id}         乐观锁更新
  DELETE /api/trades/{id}         软删除
  POST   /api/trades/{id}/restore 恢复已删除记录
"""

import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse, PaginationInfo, StandardResponse
from app.schemas.trade import (
    BulkCreateRequest,
    BulkCreateResponse,
    PaginationParams,
    SortParams,
    TradeCreate,
    TradeFilters,
    TradeResponse,
    TradeUpdate,
)
from app.services.trade_service import TradeService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_db)) -> TradeService:
    return TradeService(db)


# ── POST /api/trades ────────────────────────────────────────────


@router.post(
    "/trades",
    response_model=StandardResponse[TradeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建交易记录",
)
async def create_trade(
    data: TradeCreate,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    trade = await service.create_trade(str(current_user.id), data)
    return StandardResponse(
        success=True,
        data=TradeResponse.model_validate(trade),
        message="交易记录创建成功",
    )


# ── POST /api/trades/bulk ──────────────────────────────────────


@router.post(
    "/trades/bulk",
    response_model=StandardResponse[BulkCreateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="批量创建交易记录",
)
async def bulk_create_trades(
    body: BulkCreateRequest,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    successes, failures = await service.bulk_create_trades(
        str(current_user.id), body.trades
    )
    result = BulkCreateResponse(
        success_count=len(successes),
        failure_count=len(failures),
        successes=[TradeResponse.model_validate(t) for t in successes],
        failures=failures,
    )
    return StandardResponse(
        success=True,
        data=result,
        message=f"批量创建完成: {len(successes)} 成功, {len(failures)} 失败",
    )


# ── GET /api/trades ────────────────────────────────────────────


@router.get(
    "/trades",
    response_model=PaginatedResponse[TradeResponse],
    summary="查询交易列表",
)
async def list_trades(
    stock_code: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    market_environment: Optional[str] = Query(None),
    result_type: Optional[str] = Query(None),
    pnl_flag: Optional[str] = Query(None),
    account_type: Optional[str] = Query(None),
    trade_cycle: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("entry_date"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    filters = TradeFilters(
        stock_code=stock_code,
        start_date=start_date,
        end_date=end_date,
        market_environment=market_environment,
        result_type=result_type,
        pnl_flag=pnl_flag,
        account_type=account_type,
        trade_cycle=trade_cycle,
    )
    pagination = PaginationParams(page=page, page_size=page_size)
    sort = SortParams(sort_by=sort_by, order=order)

    trades, total = await service.get_trades(
        str(current_user.id), filters, pagination, sort
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedResponse(
        success=True,
        data=[TradeResponse.model_validate(t) for t in trades],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
        message="查询成功",
    )


# ── GET /api/trades/{id} ──────────────────────────────────────


@router.get(
    "/trades/{trade_id}",
    response_model=StandardResponse[TradeResponse],
    summary="获取单条交易记录",
)
async def get_trade(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    trade = await service.get_trade_by_id(str(current_user.id), trade_id)
    return StandardResponse(
        success=True,
        data=TradeResponse.model_validate(trade),
        message="查询成功",
    )


# ── PUT /api/trades/{id} ──────────────────────────────────────


@router.put(
    "/trades/{trade_id}",
    response_model=StandardResponse[TradeResponse],
    summary="更新交易记录（乐观锁）",
)
async def update_trade(
    trade_id: UUID,
    data: TradeUpdate,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    trade = await service.update_trade(str(current_user.id), trade_id, data)
    return StandardResponse(
        success=True,
        data=TradeResponse.model_validate(trade),
        message="交易记录更新成功",
    )


# ── DELETE /api/trades/{id} ───────────────────────────────────


@router.delete(
    "/trades/{trade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="软删除交易记录",
)
async def delete_trade(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    await service.soft_delete_trade(str(current_user.id), trade_id)
    return None


# ── POST /api/trades/{id}/restore ─────────────────────────────


@router.post(
    "/trades/{trade_id}/restore",
    response_model=StandardResponse[TradeResponse],
    summary="恢复已删除的交易记录",
)
async def restore_trade(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    trade = await service.restore_trade(str(current_user.id), trade_id)
    return StandardResponse(
        success=True,
        data=TradeResponse.model_validate(trade),
        message="交易记录恢复成功",
    )
