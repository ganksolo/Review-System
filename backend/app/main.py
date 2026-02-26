"""
FastAPI application entry point.

交易复盘系统后端服务 — Trading Review System Backend
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes.health import router as health_router

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


# ── Global Exception Handler ────────────────────────────────────


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
# TODO: app.include_router(trades_router, prefix="/api", tags=["Trades"])

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
