# Design Document - Authentication

## Architecture

### 技术选型

| 组件 | 技术 | 说明 |
| ---- | ---- | ---- |
| 密码哈希 | passlib + bcrypt | 业界标准，12 rounds |
| JWT | python-jose | 签发和验证 JWT |
| 前端状态 | React Context + localStorage | Token 持久化 |
| 路由守卫 | Next.js middleware.ts | 服务端 redirect |

### 数据库: users 表

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
```

### JWT Token 结构

**access_token payload:**

```json
{
  "sub": "<user_id (UUID)>",
  "type": "access",
  "exp": "<30 分钟后>",
  "iat": "<签发时间>"
}
```

**refresh_token payload:**

```json
{
  "sub": "<user_id (UUID)>",
  "type": "refresh",
  "exp": "<7 天后>",
  "iat": "<签发时间>"
}
```

### 认证流程

```
注册: POST /api/auth/register
  → 验证输入 → 检查 email 唯一性 → bcrypt 哈希密码 → 插入 users 表 → 签发 JWT

登录: POST /api/auth/login
  → 验证输入 → 查询 user by email → bcrypt 验证密码 → 签发 JWT

刷新: POST /api/auth/refresh
  → 验证 refresh_token → 签发新 access_token

API 请求: Authorization: Bearer <access_token>
  → get_current_user() 解析 token → 查询 user → 注入到端点
```

### 后端文件结构

```
backend/app/
├── core/
│   ├── security.py      # JWT + bcrypt 工具函数
│   └── auth.py          # get_current_user 依赖注入
├── models/
│   └── user.py          # User ORM 模型
├── schemas/
│   └── auth.py          # Pydantic 认证 schemas
└── api/routes/
    └── auth.py          # 认证 API 端点
```

### 前端文件结构

```
frontend/
├── app/
│   ├── login/page.tsx       # 登录页
│   └── register/page.tsx    # 注册页
├── lib/
│   ├── auth.tsx             # AuthProvider + useAuth hook
│   └── validations/auth.ts  # Zod 验证 schemas
├── types/
│   └── auth.ts              # 认证类型定义
└── middleware.ts            # 路由守卫
```

### 公开 vs 受保护端点

- 公开: `/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`
- 受保护: `/api/auth/me`, `/api/trades/*`, `/api/rules/*`, `/api/llm/*`
