"""
Trades API router — CRUD operations for trade records.

Endpoints:
  POST   /api/trades              创建单条交易记录
  POST   /api/trades/bulk         批量创建
  POST   /api/trades/import       CSV 文件导入
  GET    /api/trades              查询列表（过滤+分页+排序）
  GET    /api/trades/{id}         获取单条记录
  PUT    /api/trades/{id}         乐观锁更新
  DELETE /api/trades/{id}         软删除
  POST   /api/trades/{id}/restore 恢复已删除记录
"""

import csv
import io
import logging
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
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
    trade = await service.create_trade(
        str(current_user.id), data, current_user.base_capital
    )
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
        str(current_user.id), body.trades, current_user.base_capital
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


# ── POST /api/trades/import ───────────────────────────────────

_logger = logging.getLogger(__name__)

CSV_HEADER_MAP = {
    "账户类型": "account_type",
    "股票代码": "stock_code",
    "股票名称": "stock_name",
    "交易周期": "trade_cycle",
    "买入时间": "entry_date",
    "卖出时间": "exit_date",
    "仓位%": "position_size",
    "买入价": "entry_price",
    "卖出价": "exit_price",
    "预设止损": "preset_stop_loss",
    "预设止盈": "preset_take_profit",
    "滑点": "slippage",
    "最大浮盈": "max_favorable_excursion",
    "最大浮亏": "max_adverse_excursion",
    "市场环境": "market_environment",
    "板块地位": "sector_status",
    "选股维度": "selection_dimension",
    "策略模式": "strategy_pattern",
    "量能特征": "volume_profile",
    "交易论点": "thesis_statement",
    "计划执行度": "plan_adherence",
    "止损纪律": "stop_loss_discipline",
    "离场类型": "exit_type",
    "离场原因": "exit_reason",
    "心理状态": "psychological_state",
    "结果归因": "result_type",
    "错误层级": "error_level",
    "环境错配": "environment_mismatch_flag",
    "永久排除": "permanent_exclusion_flag",
    "正确行为": "correct_action",
}

FLOAT_FIELDS = {
    "position_size", "entry_price", "exit_price",
    "preset_stop_loss", "preset_take_profit", "slippage",
    "max_favorable_excursion", "max_adverse_excursion",
}
ARRAY_FIELDS = {"selection_dimension", "strategy_pattern"}
BOOL_FIELDS = {"environment_mismatch_flag", "permanent_exclusion_flag"}


def _parse_csv_row(row: dict) -> dict:
    """Map Chinese CSV headers to TradeCreate field names and coerce types."""
    data = {}
    for cn_header, field in CSV_HEADER_MAP.items():
        val = row.get(cn_header, "").strip()
        if not val:
            continue

        if field in FLOAT_FIELDS:
            data[field] = float(val)
        elif field in ARRAY_FIELDS:
            data[field] = [s.strip() for s in val.split(";") if s.strip()]
        elif field in BOOL_FIELDS:
            data[field] = val in ("是", "true", "True", "1")
        else:
            data[field] = val

    return data


@router.post(
    "/trades/import",
    response_model=StandardResponse,
    summary="CSV 文件导入交易记录",
)
async def import_trades_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: TradeService = Depends(get_service),
):
    if not file.filename or not file.filename.endswith(".csv"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "请上传 .csv 文件"},
        )

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("gbk", errors="replace")

    reader = csv.DictReader(io.StringIO(text))
    success_count = 0
    failures = []

    for i, row in enumerate(reader, start=2):
        try:
            parsed = _parse_csv_row(row)
            if not parsed.get("stock_code") or not parsed.get("correct_action"):
                failures.append({"row": i, "error": "缺少必填字段: 股票代码 或 正确行为"})
                continue

            trade_data = TradeCreate(**parsed)
            await service.create_trade(
                str(current_user.id), trade_data, current_user.base_capital
            )
            success_count += 1
        except Exception as e:
            _logger.warning("CSV import row %d failed: %s", i, e)
            failures.append({"row": i, "error": str(e)})

    return StandardResponse(
        success=True,
        data={
            "success_count": success_count,
            "failure_count": len(failures),
            "failures": failures[:50],
        },
        message=f"导入完成: {success_count} 条成功, {len(failures)} 条失败",
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
    trade = await service.update_trade(
        str(current_user.id), trade_id, data, current_user.base_capital
    )
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
