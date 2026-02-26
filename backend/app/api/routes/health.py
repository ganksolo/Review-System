"""
Health check endpoint for monitoring and Railway deployment checks.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check endpoint.
    Verifies database connectivity and returns service status.
    Railway uses this to determine if the service is healthy.
    """
    try:
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    is_healthy = db_status == "healthy"

    response = {
        "status": "healthy" if is_healthy else "unhealthy",
        "version": settings.API_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_status,
        },
    }

    if not is_healthy:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=response)

    return response
