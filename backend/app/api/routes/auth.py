"""
Authentication API endpoints — register, login, refresh, me.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
)
from app.schemas.common import StandardResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=StandardResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
    summary="用户注册",
)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == data.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该邮箱已被注册",
        )

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    tokens = AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )

    logger.info("User registered: %s", user.email)
    return StandardResponse(success=True, data=tokens, message="注册成功")


@router.post(
    "/login",
    response_model=StandardResponse[AuthResponse],
    summary="用户登录",
)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    if "@" in data.account:
        stmt = select(User).where(User.email == data.account)
    else:
        stmt = select(User).where(User.username == data.account)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    tokens = AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )

    logger.info("User logged in: %s", user.email)
    return StandardResponse(success=True, data=tokens, message="登录成功")


@router.post(
    "/refresh",
    response_model=StandardResponse[AuthResponse],
    summary="刷新 Token",
)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的 refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh token 已过期或无效",
        )

    from uuid import UUID

    stmt = select(User).where(User.id == UUID(user_id), User.is_active.is_(True))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用",
        )

    tokens = AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
    return StandardResponse(success=True, data=tokens, message="Token 已刷新")


@router.get(
    "/me",
    response_model=StandardResponse[UserResponse],
    summary="获取当前用户信息",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return StandardResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
        message="获取用户信息成功",
    )
