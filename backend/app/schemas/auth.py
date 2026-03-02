"""
Pydantic schemas for authentication endpoints.
"""

from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("用户名不能为空")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("密码长度至少 8 位")
        return v


class LoginRequest(BaseModel):
    account: str
    password: str

    @field_validator("account")
    @classmethod
    def account_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("请输入邮箱或用户名")
        return v.strip()


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool

    model_config = {"from_attributes": True}
