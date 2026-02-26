# Requirements Document - Authentication

## Introduction

本文档定义交易复盘系统的用户认证与鉴权需求。V1 阶段采用轻量级认证方案（简单 Token），预留未来接入 Auth0/Clerk 等第三方认证服务的扩展能力。

## Glossary

- **Auth_System**: 认证与鉴权系统
- **User**: 系统用户，拥有唯一的 user_id
- **Token**: 用于识别用户身份的令牌
- **API_Key**: 简单的 API 密钥认证（V1 阶段）
- **Auth_Provider**: 第三方认证服务提供商（Auth0/Clerk，V2 预留）

## Requirements

### Requirement 1: V1 轻量级用户识别

**User Story:** 作为个人交易者，我希望系统能识别我的身份，以便数据隔离和安全访问。

#### Acceptance Criteria

1. THE Auth_System SHALL 支持通过 HTTP Header `X-User-ID` 传递用户标识
2. WHEN X-User-ID 未提供 THEN THE Auth_System SHALL 返回 401 状态码和未认证错误信息
3. WHEN X-User-ID 为空字符串 THEN THE Auth_System SHALL 返回 401 状态码
4. THE Auth_System SHALL 将 user_id 注入到所有 API 端点的参数中
5. THE Auth_System SHALL 在数据库查询中使用 user_id 进行数据隔离

### Requirement 2: 数据隔离

**User Story:** 作为用户，我希望只能访问自己的数据，以便保护交易隐私。

#### Acceptance Criteria

1. WHEN 用户查询交易记录 THEN THE Auth_System SHALL 只返回该 user_id 对应的记录
2. WHEN 用户更新或删除交易记录 THEN THE Auth_System SHALL 验证该记录属于当前用户
3. WHEN 用户尝试访问其他用户的记录 THEN THE Auth_System SHALL 返回 404 状态码（不泄露记录存在性）
4. THE Auth_System SHALL 在 Trade 模型的复合索引 (user_id, deleted_at) 上优化查询性能

### Requirement 3: V2 扩展预留

**User Story:** 作为系统架构师，我希望认证模块易于扩展，以便未来接入第三方认证服务。

#### Acceptance Criteria

1. THE Auth_System SHALL 将认证逻辑封装为 FastAPI 依赖注入函数 `get_current_user()`
2. THE Auth_System SHALL 定义标准的 User Schema（id, email, name）用于依赖注入返回值
3. WHEN 未来切换到 Auth0/Clerk THEN THE Auth_System SHALL 只需修改 `get_current_user()` 实现而不影响业务代码
4. THE Auth_System SHALL 支持通过环境变量 AUTH_MODE 切换认证模式（simple / auth0 / clerk）
5. THE Auth_System SHALL 在 simple 模式下使用 X-User-ID Header，在 auth0/clerk 模式下使用 Bearer Token

### Requirement 4: 安全实践

**User Story:** 作为系统管理员，我希望认证模块遵循安全最佳实践，以便防止常见攻击。

#### Acceptance Criteria

1. THE Auth_System SHALL 不在日志中记录认证令牌或密钥
2. THE Auth_System SHALL 不在错误响应中泄露认证实现细节
3. THE Auth_System SHALL 支持 HTTPS（由 Railway 自动处理 TLS）
4. THE Auth_System SHALL 在 CORS 配置中限制允许的源
5. THE Auth_System SHALL 在环境变量中存储所有认证相关的密钥和配置
