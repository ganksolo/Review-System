# Implementation Plan: Authentication

## Overview

为交易复盘系统实现完整的登录/注册认证功能，包括 JWT 鉴权、User 模型、前端 UI 和路由保护。

## Tasks

- [x] 1. 后端: User 模型与数据库
  - [x] 1.1 创建 models/user.py 定义 User ORM 模型
  - [x] 1.2 新增 passlib[bcrypt] 和 python-jose[cryptography] 到 requirements.txt
  - [x] 1.3 生成 Alembic 迁移脚本创建 users 表
  - [x] 1.4 更新 config.py 新增 JWT 配置项

- [x] 2. 后端: 安全模块
  - [x] 2.1 创建 core/security.py (密码哈希 + JWT 签发/验证)
  - [x] 2.2 创建 core/auth.py (get_current_user 依赖注入)
  - [x] 2.3 创建 schemas/auth.py (Pydantic 认证 schemas)

- [x] 3. 后端: 认证 API
  - [x] 3.1 创建 api/routes/auth.py (register/login/refresh/me)
  - [x] 3.2 注册到 main.py 路由

- [x] 4. 后端: 集成认证到业务 API
  - [x] 4.1 替换 trades.py 中的 DEFAULT_USER_ID
  - [x] 4.2 替换 rules.py 中的 DEFAULT_USER_ID
  - [x] 4.3 修复 llm.py 用户隔离
  - [x] 4.4 修复 LLM analyzer 用户隔离

- [x] 5. 前端: 认证基础设施
  - [x] 5.1 创建 types/auth.ts 类型定义
  - [x] 5.2 创建 lib/validations/auth.ts Zod schemas
  - [x] 5.3 创建 lib/auth.tsx AuthProvider + useAuth hook
  - [x] 5.4 更新 lib/api.ts 自动携带 Authorization header
  - [x] 5.5 创建 middleware.ts 路由守卫

- [x] 6. 前端: 登录/注册页面
  - [x] 6.1 创建 app/login/page.tsx
  - [x] 6.2 创建 app/register/page.tsx
  - [x] 6.3 更新 app/layout.tsx 集成 AuthProvider

- [x] 7. 文档与部署
  - [x] 7.1 更新 README.md
  - [x] 7.2 更新 backend/.env.example
  - [x] 7.3 更新 DATABASE_SCHEMA.md
  - [x] 7.4 更新 Railway 部署配置
