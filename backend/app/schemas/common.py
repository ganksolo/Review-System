"""
Common response models used across all API endpoints.

统一 API 响应格式: {success, data, message, error}
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    """统一的 API 响应格式"""

    success: bool
    data: Optional[T] = None
    message: str
    error: Optional[Dict[str, Any]] = None


class PaginationInfo(BaseModel):
    """分页信息"""

    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """带分页的列表响应"""

    success: bool
    data: List[T]
    pagination: PaginationInfo
    message: str
