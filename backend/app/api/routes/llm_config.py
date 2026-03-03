"""
LLM Config API endpoints — manage user-level LLM provider settings.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.encryption import get_encryptor
from app.db.session import get_db
from app.models.llm_config import LLMConfig
from app.models.user import User
from app.schemas.common import StandardResponse
from app.schemas.llm_config import LLMConfigRequest, LLMConfigResponse, LLMConfigUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm-config", tags=["LLM Config"])


def _to_response(cfg: LLMConfig, encryptor) -> LLMConfigResponse:
    """Convert DB model to response with masked key."""
    try:
        raw_key = encryptor.decrypt(cfg.encrypted_key) if encryptor else "****"
        masked = encryptor.mask(raw_key) if encryptor else "****"
    except Exception:
        masked = "****（解密失败）"

    return LLMConfigResponse(
        id=str(cfg.id),
        provider=cfg.provider,
        masked_key=masked,
        base_url=cfg.base_url,
        model_name=cfg.model_name,
        is_active=cfg.is_active,
    )


@router.get("", response_model=StandardResponse[Optional[LLMConfigResponse]])
async def get_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的活跃 LLM 配置"""
    stmt = select(LLMConfig).where(
        LLMConfig.user_id == current_user.id,
        LLMConfig.is_active.is_(True),
    )
    cfg = (await db.execute(stmt)).scalar_one_or_none()

    if not cfg:
        return StandardResponse(success=True, data=None, message="暂无配置")

    encryptor = get_encryptor()
    return StandardResponse(
        success=True,
        data=_to_response(cfg, encryptor),
        message="获取配置成功",
    )


@router.post("", response_model=StandardResponse[LLMConfigResponse])
async def save_config(
    data: LLMConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建或更新 LLM 配置（每用户仅一条活跃配置）"""
    encryptor = get_encryptor()
    if not encryptor:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务端未配置 ENCRYPTION_KEY，无法保存 API Key",
        )

    encrypted = encryptor.encrypt(data.api_key)

    stmt = select(LLMConfig).where(
        LLMConfig.user_id == current_user.id,
        LLMConfig.is_active.is_(True),
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        existing.provider = data.provider
        existing.encrypted_key = encrypted
        existing.base_url = data.base_url
        existing.model_name = data.model_name
        cfg = existing
    else:
        cfg = LLMConfig(
            user_id=current_user.id,
            provider=data.provider,
            encrypted_key=encrypted,
            base_url=data.base_url,
            model_name=data.model_name,
            is_active=True,
        )
        db.add(cfg)

    await db.commit()
    await db.refresh(cfg)

    return StandardResponse(
        success=True,
        data=_to_response(cfg, encryptor),
        message="保存配置成功",
    )


@router.put("", response_model=StandardResponse[LLMConfigResponse])
async def update_config(
    data: LLMConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """部分更新 LLM 配置（API Key 为空则不修改）"""
    stmt = select(LLMConfig).where(
        LLMConfig.user_id == current_user.id,
        LLMConfig.is_active.is_(True),
    )
    cfg = (await db.execute(stmt)).scalar_one_or_none()

    if not cfg:
        raise HTTPException(status_code=404, detail="未找到活跃配置")

    encryptor = get_encryptor()
    if not encryptor:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务端未配置 ENCRYPTION_KEY",
        )

    if data.provider is not None:
        cfg.provider = data.provider
    if data.api_key and data.api_key.strip():
        cfg.encrypted_key = encryptor.encrypt(data.api_key.strip())
    if data.base_url is not None:
        cfg.base_url = data.base_url
    if data.model_name is not None:
        cfg.model_name = data.model_name

    await db.commit()
    await db.refresh(cfg)

    return StandardResponse(
        success=True,
        data=_to_response(cfg, encryptor),
        message="更新配置成功",
    )


@router.delete("/{config_id}", response_model=StandardResponse)
async def delete_config(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除 LLM 配置"""
    stmt = select(LLMConfig).where(
        LLMConfig.id == config_id,
        LLMConfig.user_id == current_user.id,
    )
    cfg = (await db.execute(stmt)).scalar_one_or_none()

    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")

    await db.delete(cfg)
    await db.commit()

    return StandardResponse(success=True, message="删除配置成功")
