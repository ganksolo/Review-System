"""
LLMConfig ORM model — maps to the `llm_configs` PostgreSQL table.

Stores encrypted LLM API keys and provider configuration per user.
"""

import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.sql import func

from app.models.base import Base


class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    provider = Column(String(50), nullable=False)
    encrypted_key = Column(Text, nullable=False)
    base_url = Column(String(500), nullable=True)
    model_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<LLMConfig(id={self.id}, provider={self.provider}, active={self.is_active})>"
