# Design Document: LLM Config Management

## Overview

实现 LLM 模型配置的动态管理：用户通过前端 Dialog 填写 API Key、Base URL、Model Name，后端 Fernet 加密存入 PostgreSQL，LLM 调用时解密使用。支持 fallback 到环境变量。

### 核心技术栈

- **cryptography (Fernet)**: AES 对称加密
- **SQLAlchemy**: ORM 模型
- **Alembic**: 数据库迁移
- **shadcn/ui Dialog**: 前端弹窗

### 设计原则

1. **密钥不落地代码**: API Key 仅在内存中明文存在，DB 中加密存储
2. **降级兼容**: DB 配置 → 环境变量 → 报错
3. **单活跃配置**: 每个用户仅一条 is_active=true 的配置

## Architecture

### 数据库模型

```python
class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)     # openai / deepseek / anthropic / custom
    encrypted_key = Column(Text, nullable=False)       # Fernet 加密后的 API Key
    base_url = Column(String(500), nullable=True)      # 自定义 API 端点
    model_name = Column(String(200), nullable=True)    # 模型名称
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 加密工具

```python
from cryptography.fernet import Fernet

class KeyEncryptor:
    def __init__(self, encryption_key: str):
        self.cipher = Fernet(encryption_key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self.cipher.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        return self.cipher.decrypt(ciphertext.encode()).decode()

    @staticmethod
    def mask(key: str) -> str:
        if len(key) <= 8:
            return "****"
        return f"{key[:4]}****{key[-4:]}"
```

### API 端点

| Method | Path | 描述 |
| ------ | ---- | ---- |
| GET | /api/llm-config | 获取当前用户活跃配置（Key 脱敏） |
| POST | /api/llm-config | 创建/更新配置 |
| DELETE | /api/llm-config/{id} | 删除配置 |

### LLM Client 降级流程

```
调用 LLM 分析
    ├── 查询 DB: user 的 is_active=true 配置
    │   ├── 有 → 解密 API Key, 使用 DB 配置
    │   └── 无 → 使用环境变量 LLM_API_KEY / LLM_API_BASE / LLM_MODEL
    └── 都无 → 抛出 ConfigurationError
```

### 前端 Dialog

- 触发入口: 侧边栏设置图标
- 表单字段: Provider (select), API Key (password), Base URL (text), Model Name (text)
- 已有配置时回填（API Key 脱敏）
- 编辑时 API Key 字段为空表示不修改

## Error Handling

- ENCRYPTION_KEY 未配置: 启动时 warning 日志，加密/解密操作返回错误
- API Key 解密失败: 降级到环境变量，日志记录错误
- DB 查询失败: 降级到环境变量

## Testing Strategy

- 加密/解密单元测试
- API 端点集成测试 (mock DB)
- 降级逻辑测试
