"""
LLM Analysis API routes.
"""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.llm.analyzer import trade_analyzer
from app.llm.client import llm_client
from app.llm.cost_tracker import cost_tracker
from app.models.user import User
from app.schemas.common import StandardResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["LLM Analysis"])


@router.post("/trades/{trade_id}/analyze", response_model=StandardResponse)
async def trigger_analysis(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """手动触发单条交易的 LLM 分析。"""
    result = await trade_analyzer.analyze_trade(
        db, trade_id, user_id=str(current_user.id)
    )
    await db.commit()

    if result:
        return StandardResponse(
            success=True,
            data=result.model_dump(),
            message="LLM 分析完成",
        )
    return StandardResponse(
        success=False,
        data=None,
        message="LLM 分析失败，请查看日志或稍后重试",
    )


class BatchAnalyzeRequest(BaseModel):
    trade_ids: List[UUID]
    max_concurrent: int = 3


@router.post("/trades/batch-analyze", response_model=StandardResponse)
async def batch_analyze(
    req: BatchAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量触发多条交易的 LLM 分析（并行 + 限流）。"""
    results = await trade_analyzer.analyze_batch(
        db, req.trade_ids, req.max_concurrent, user_id=str(current_user.id)
    )

    succeeded = [(str(tid), r.model_dump()) for tid, r in results if r is not None]
    failed = [str(tid) for tid, r in results if r is None]

    return StandardResponse(
        success=True,
        data={
            "total": len(results),
            "succeeded": len(succeeded),
            "failed": len(failed),
            "results": succeeded,
            "failed_ids": failed,
        },
        message=f"批量分析完成: {len(succeeded)} 成功, {len(failed)} 失败",
    )


@router.get("/llm/health", response_model=StandardResponse)
async def llm_health(current_user: User = Depends(get_current_user)):
    """检查 LLM 服务连通性。"""
    ok = await llm_client.health_check()
    return StandardResponse(
        success=ok,
        data={"status": "healthy" if ok else "unhealthy"},
        message="LLM 服务正常" if ok else "LLM 服务不可用",
    )


@router.get("/llm/cost", response_model=StandardResponse)
async def llm_cost_summary(current_user: User = Depends(get_current_user)):
    """获取 LLM 使用成本汇总。"""
    summary = cost_tracker.get_summary()
    return StandardResponse(
        success=True,
        data=summary,
        message=f"共 {summary['total_calls']} 次调用",
    )
