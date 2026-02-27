"""
Rules API router — Dynamic rule library endpoints.

Endpoints:
  GET /api/rules/exclusions            永久排除清单
  GET /api/rules/correct-behaviors     正确行为清单
  GET /api/rules/environment-mismatches 环境错配提醒
  GET /api/rules/summary               规则库汇总统计
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.schemas.trade import RulesSummary, TradeResponse
from app.services.trade_service import TradeService

router = APIRouter()

# ── 临时 user_id 常量 (认证系统完成前使用) ────────────────────────
DEFAULT_USER_ID = "default-user"


def get_service(db: AsyncSession = Depends(get_db)) -> TradeService:
    return TradeService(db)


# ── GET /api/rules/exclusions ─────────────────────────────────


@router.get(
    "/rules/exclusions",
    response_model=StandardResponse[list[TradeResponse]],
    summary="永久排除清单",
    description="返回所有标记为 permanent_exclusion_flag=true 的交易记录",
)
async def get_exclusions(
    service: TradeService = Depends(get_service),
):
    trades = await service.get_permanent_exclusions(DEFAULT_USER_ID)
    return StandardResponse(
        success=True,
        data=[TradeResponse.model_validate(t) for t in trades],
        message=f"共 {len(trades)} 条永久排除记录",
    )


# ── GET /api/rules/correct-behaviors ──────────────────────────


@router.get(
    "/rules/correct-behaviors",
    response_model=StandardResponse[list[TradeResponse]],
    summary="正确行为清单",
    description="返回所有 result_type=正确盈利 的交易记录",
)
async def get_correct_behaviors(
    service: TradeService = Depends(get_service),
):
    trades = await service.get_correct_behaviors(DEFAULT_USER_ID)
    return StandardResponse(
        success=True,
        data=[TradeResponse.model_validate(t) for t in trades],
        message=f"共 {len(trades)} 条正确行为记录",
    )


# ── GET /api/rules/environment-mismatches ─────────────────────


@router.get(
    "/rules/environment-mismatches",
    response_model=StandardResponse[list[TradeResponse]],
    summary="环境错配提醒",
    description="返回所有 environment_mismatch_flag=true 的交易记录",
)
async def get_environment_mismatches(
    service: TradeService = Depends(get_service),
):
    trades = await service.get_environment_mismatches(DEFAULT_USER_ID)
    return StandardResponse(
        success=True,
        data=[TradeResponse.model_validate(t) for t in trades],
        message=f"共 {len(trades)} 条环境错配记录",
    )


# ── GET /api/rules/summary ───────────────────────────────────


@router.get(
    "/rules/summary",
    response_model=StandardResponse[RulesSummary],
    summary="规则库汇总统计",
    description="返回各规则类别的统计数量",
)
async def get_rules_summary(
    service: TradeService = Depends(get_service),
):
    summary = await service.get_rules_summary(DEFAULT_USER_ID)
    return StandardResponse(
        success=True,
        data=RulesSummary(**summary),
        message="规则库统计查询成功",
    )
