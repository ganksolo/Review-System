"""
FastAPI application entry point.

交易复盘系统后端服务 — Trading Review System Backend
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import (
    BusinessValidationError,
    OptimisticLockError,
    TradeNotFoundError,
)
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.trades import router as trades_router
from app.api.routes.rules import router as rules_router
from app.api.routes.llm import router as llm_router
from app.api.routes.llm_config import router as llm_config_router

# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── FastAPI App ──────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="交易复盘系统 API — 支持交易记录 CRUD、LLM 归因分析和动态规则库",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Request Logging Middleware ───────────────────────────────────


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with method, path, status, and duration."""
    start_time = time.time()
    logger.info("Request: %s %s", request.method, request.url.path)

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(
        "Response: %s %s → %d (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        process_time,
    )
    return response


# ── Exception Handlers ───────────────────────────────────────────


@app.exception_handler(TradeNotFoundError)
async def trade_not_found_handler(request: Request, exc: TradeNotFoundError):
    """404 — 交易记录不存在"""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "message": str(exc),
            "error": {
                "code": "TRADE_NOT_FOUND",
                "details": {"trade_id": str(exc.trade_id)},
            },
        },
    )


@app.exception_handler(OptimisticLockError)
async def optimistic_lock_handler(request: Request, exc: OptimisticLockError):
    """409 — 乐观锁版本冲突"""
    return JSONResponse(
        status_code=409,
        content={
            "success": False,
            "message": str(exc),
            "error": {
                "code": "OPTIMISTIC_LOCK_CONFLICT",
                "details": {
                    "expected_version": exc.expected,
                    "actual_version": exc.actual,
                },
            },
        },
    )


@app.exception_handler(BusinessValidationError)
async def business_validation_handler(
    request: Request, exc: BusinessValidationError
):
    """422 — 业务逻辑验证失败"""
    error_details = {"message": str(exc)}
    if exc.field:
        error_details["field"] = exc.field
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": str(exc),
            "error": {
                "code": "BUSINESS_VALIDATION_ERROR",
                "details": error_details,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request, exc: RequestValidationError
):
    """400 — Pydantic 请求数据验证失败"""
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": " → ".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "message": "请求数据验证失败",
            "error": {
                "code": "VALIDATION_ERROR",
                "details": errors,
            },
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler to prevent leaking internal details."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred",
            "error": {"code": "INTERNAL_SERVER_ERROR"},
        },
    )


# ── Routes ───────────────────────────────────────────────────────

app.include_router(health_router, tags=["Health"])
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(trades_router, prefix="/api", tags=["Trades"])
app.include_router(rules_router, prefix="/api", tags=["Rules"])
app.include_router(llm_router, prefix="/api", tags=["LLM"])
app.include_router(llm_config_router, prefix="/api", tags=["LLM Config"])

# ── Startup Event ────────────────────────────────────────────────


@app.on_event("startup")
async def on_startup():
    logger.info(
        "🚀 %s v%s starting on port %s",
        settings.APP_NAME,
        settings.API_VERSION,
        settings.PORT,
    )
    logger.info("CORS origins: %s", settings.cors_origins)


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down %s", settings.APP_NAME)
