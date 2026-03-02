# Requirements Document - Authentication

## Introduction

本文档定义交易复盘系统的用户认证与鉴权需求。采用 JWT 双 Token 方案（access_token + refresh_token），支持邮箱注册登录，预留未来接入第三方认证服务的扩展能力。

## Glossary

- **Auth_System**: 认证与鉴权系统
- **User**: 系统用户，拥有唯一的 user_id、email
- **access_token**: 短期 JWT（30 分钟），用于 API 认证
- **refresh_token**: 长期 JWT（7 天），用于刷新 access_token
- **bcrypt**: 密码哈希算法

## Requirements

### Requirement 1: 用户注册

**User Story:** 作为新用户，我希望通过邮箱和密码注册账号，以便使用交易复盘系统。

#### Acceptance Criteria

1. THE Auth_System SHALL 提供 `POST /api/auth/register` 端点
2. THE Auth_System SHALL 要求 email（唯一）、username、password 三个必填字段
3. WHEN email 已被注册 THEN THE Auth_System SHALL 返回 409 状态码
4. THE Auth_System SHALL 使用 bcrypt 对密码进行哈希后存储
5. THE Auth_System SHALL 在注册成功后返回 access_token 和 refresh_token
6. THE Auth_System SHALL 验证 password 长度至少 8 位
7. THE Auth_System SHALL 验证 email 格式正确

### Requirement 2: 用户登录

**User Story:** 作为已注册用户，我希望通过邮箱和密码登录，以便访问我的交易数据。

#### Acceptance Criteria

1. THE Auth_System SHALL 提供 `POST /api/auth/login` 端点
2. WHEN 邮箱不存在或密码错误 THEN THE Auth_System SHALL 返回 401 状态码和通用错误消息（不区分邮箱不存在和密码错误）
3. WHEN 用户账号被禁用 (is_active=false) THEN THE Auth_System SHALL 返回 403 状态码
4. THE Auth_System SHALL 在登录成功后返回 access_token 和 refresh_token

### Requirement 3: Token 管理

**User Story:** 作为已登录用户，我希望 token 能自动刷新，避免频繁重新登录。

#### Acceptance Criteria

1. THE Auth_System SHALL 签发 access_token（有效期 30 分钟）和 refresh_token（有效期 7 天）
2. THE Auth_System SHALL 提供 `POST /api/auth/refresh` 端点，用 refresh_token 换取新的 access_token
3. WHEN access_token 过期 THEN 前端 SHALL 自动使用 refresh_token 刷新
4. WHEN refresh_token 过期 THEN THE Auth_System SHALL 要求用户重新登录
5. THE Auth_System SHALL 使用 HS256 算法签名 JWT

### Requirement 4: API 认证

**User Story:** 作为系统，我需要验证每个 API 请求的用户身份，以便实现数据隔离。

#### Acceptance Criteria

1. THE Auth_System SHALL 通过 `Authorization: Bearer <access_token>` Header 验证请求
2. WHEN token 未提供或无效 THEN THE Auth_System SHALL 返回 401 状态码
3. THE Auth_System SHALL 将认证逻辑封装为 FastAPI 依赖注入函数 `get_current_user()`
4. THE Auth_System SHALL 在所有业务 API 中使用 `get_current_user()` 替换硬编码的 DEFAULT_USER_ID
5. THE Auth_System SHALL 确保用户只能访问自己的交易数据（数据隔离）

### Requirement 5: 安全实践

**User Story:** 作为系统管理员，我希望认证模块遵循安全最佳实践。

#### Acceptance Criteria

1. THE Auth_System SHALL 不在日志中记录密码或 token
2. THE Auth_System SHALL 不在错误响应中泄露认证实现细节
3. THE Auth_System SHALL 在 CORS 配置中限制允许的源
4. THE Auth_System SHALL 在环境变量中存储 JWT_SECRET
5. THE Auth_System SHALL 使用 bcrypt 的足够 rounds（默认 12）进行密码哈希

### Requirement 6: 前端认证 UI

**User Story:** 作为用户，我希望有美观的登录和注册页面。

#### Acceptance Criteria

1. THE Frontend SHALL 提供 `/login` 登录页面（邮箱 + 密码）
2. THE Frontend SHALL 提供 `/register` 注册页面（用户名 + 邮箱 + 密码 + 确认密码）
3. THE Frontend SHALL 在未登录时将所有页面重定向到 `/login`
4. THE Frontend SHALL 遵循 OLED 深色设计系统
5. THE Frontend SHALL 在表单中提供即时验证和错误提示
6. THE Frontend SHALL 在登录/注册成功后跳转到首页
