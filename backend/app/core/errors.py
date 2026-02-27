"""
Custom exception classes for the Trading Review System.

Each exception maps to a specific HTTP status code:
  - TradeNotFoundError  → 404
  - OptimisticLockError → 409
  - BusinessValidationError → 422
"""

from typing import Optional
from uuid import UUID


class TradeNotFoundError(Exception):
    """交易记录不存在（404）"""

    def __init__(self, trade_id: UUID):
        self.trade_id = trade_id
        super().__init__(f"交易记录不存在: {trade_id}")


class OptimisticLockError(Exception):
    """版本冲突 — 乐观锁检测到并发修改（409）"""

    def __init__(self, expected: int, actual: int):
        self.expected = expected
        self.actual = actual
        super().__init__(f"版本冲突: 期望 {expected}, 实际 {actual}")


class BusinessValidationError(Exception):
    """业务逻辑验证失败（422）"""

    def __init__(self, message: str, field: Optional[str] = None):
        self.field = field
        super().__init__(message)
