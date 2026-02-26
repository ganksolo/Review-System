# Requirements Document

## Introduction

本文档定义了交易复盘系统的 FastAPI 后端服务需求。该服务基于已完成的 database-schema，提供 RESTful API 接口，支持交易记录的完整生命周期管理，包括创建、查询、更新、删除等操作，并提供丰富的查询过滤、分页和排序功能。

## Glossary

- **API_Service**: FastAPI 后端服务，提供 RESTful API 接口
- **Trade_Record**: 交易记录，存储在数据库中的交易数据
- **Request_Validator**: 请求验证器，使用 Pydantic 模型验证输入数据
- **Database_Session**: 数据库会话，用于执行数据库操作
- **Pagination**: 分页机制，用于限制返回的记录数量
- **Soft_Delete**: 软删除，标记记录为已删除但不从数据库中物理删除
- **Optimistic_Lock**: 乐观锁，使用版本号防止并发更新冲突
- **CORS**: 跨域资源共享，允许前端从不同域访问 API
- **Health_Check**: 健康检查端点，用于监控服务状态

## Requirements

### Requirement 1: 交易记录创建

**User Story:** 作为 API 用户，我希望能够创建新的交易记录，以便记录我的交易历史。

#### Acceptance Criteria

1. WHEN 用户发送 POST 请求到 /api/trades 并提供有效的交易数据 THEN THE API_Service SHALL 创建新的交易记录并返回 201 状态码和创建的记录
2. WHEN 创建请求包含所有必填字段（stock_code, entry_price, position_size, correct_action）THEN THE Request_Validator SHALL 验证通过
3. WHEN 创建请求的价格字段小于或等于 0 THEN THE Request_Validator SHALL 拒绝请求并返回 400 状态码
4. WHEN 创建请求的仓位大小不在 0-100 范围内 THEN THE Request_Validator SHALL 拒绝请求并返回 400 状态码
5. WHEN 创建请求的 exit_date 早于 entry_date THEN THE Request_Validator SHALL 拒绝请求并返回 422 状态码
6. WHEN 创建请求的枚举字段值无效 THEN THE Request_Validator SHALL 拒绝请求并返回 400 状态码
7. WHEN 交易记录创建成功 THEN THE API_Service SHALL 自动计算并存储 pnl_amount 和 pnl_percentage
8. WHEN 交易记录创建成功 THEN THE API_Service SHALL 返回包含 success=true 和完整记录数据的 JSON 响应

### Requirement 2: 交易记录查询

**User Story:** 作为 API 用户，我希望能够查询交易记录列表，以便查看和分析我的交易历史。

#### Acceptance Criteria

1. WHEN 用户发送 GET 请求到 /api/trades THEN THE API_Service SHALL 返回交易记录列表和 200 状态码
2. WHEN 查询请求不包含分页参数 THEN THE API_Service SHALL 使用默认值 page=1 和 page_size=20
3. WHEN 查询请求的 page_size 超过 100 THEN THE API_Service SHALL 限制为最大值 100
4. WHEN 查询请求包含 stock_code 参数 THEN THE API_Service SHALL 只返回匹配该股票代码的记录
5. WHEN 查询请求包含日期范围参数（start_date, end_date）THEN THE API_Service SHALL 只返回该日期范围内的记录
6. WHEN 查询请求包含 market_environment 参数 THEN THE API_Service SHALL 只返回匹配该市场环境的记录
7. WHEN 查询请求包含 result_type 参数 THEN THE API_Service SHALL 只返回匹配该结果类型的记录
8. WHEN 查询请求包含 pnl_flag 参数 THEN THE API_Service SHALL 只返回匹配该盈亏标志的记录
9. WHEN 查询请求包含多个过滤条件 THEN THE API_Service SHALL 返回同时满足所有条件的记录
10. WHEN 查询请求不包含排序参数 THEN THE API_Service SHALL 按 entry_date 降序返回记录
11. WHEN 查询请求包含 sort_by 和 order 参数 THEN THE API_Service SHALL 按指定字段和顺序返回记录
12. WHEN 查询成功 THEN THE API_Service SHALL 返回包含 data 数组和 pagination 对象的响应

### Requirement 3: 单条交易记录查询

**User Story:** 作为 API 用户，我希望能够获取单条交易记录的详细信息，以便查看完整的交易数据。

#### Acceptance Criteria

1. WHEN 用户发送 GET 请求到 /api/trades/{id} 并提供有效的记录 ID THEN THE API_Service SHALL 返回该交易记录和 200 状态码
2. WHEN 请求的记录 ID 不存在 THEN THE API_Service SHALL 返回 404 状态码和错误信息
3. WHEN 请求的记录已被软删除 THEN THE API_Service SHALL 返回 404 状态码
4. WHEN 查询成功 THEN THE API_Service SHALL 返回包含完整记录数据的 JSON 响应

### Requirement 4: 交易记录更新

**User Story:** 作为 API 用户，我希望能够更新交易记录，以便修正或补充交易信息。

#### Acceptance Criteria

1. WHEN 用户发送 PUT 请求到 /api/trades/{id} 并提供有效的更新数据 THEN THE API_Service SHALL 更新记录并返回 200 状态码
2. WHEN 更新请求的记录 ID 不存在 THEN THE API_Service SHALL 返回 404 状态码
3. WHEN 更新请求包含 version 字段且与数据库中的版本不匹配 THEN THE API_Service SHALL 返回 409 状态码和冲突错误
4. WHEN 更新请求的数据验证失败 THEN THE Request_Validator SHALL 拒绝请求并返回 400 状态码
5. WHEN 更新成功 THEN THE API_Service SHALL 自动递增 version 字段
6. WHEN 更新成功 THEN THE API_Service SHALL 重新计算 pnl_amount 和 pnl_percentage
7. WHEN 更新成功 THEN THE API_Service SHALL 更新 updated_at 时间戳
8. WHEN 更新成功 THEN THE API_Service SHALL 返回更新后的完整记录数据

### Requirement 5: 交易记录删除和恢复

**User Story:** 作为 API 用户，我希望能够删除和恢复交易记录，以便管理不需要的或误删的记录。

#### Acceptance Criteria

1. WHEN 用户发送 DELETE 请求到 /api/trades/{id} THEN THE API_Service SHALL 执行软删除并返回 204 状态码
2. WHEN 删除请求的记录 ID 不存在 THEN THE API_Service SHALL 返回 404 状态码
3. WHEN 软删除执行时 THEN THE API_Service SHALL 设置 deleted_at 时间戳而不是物理删除记录
4. WHEN 用户发送 POST 请求到 /api/trades/{id}/restore THEN THE API_Service SHALL 恢复已删除的记录并返回 200 状态码
5. WHEN 恢复请求的记录未被删除 THEN THE API_Service SHALL 返回 400 状态码和错误信息
6. WHEN 恢复成功 THEN THE API_Service SHALL 清除 deleted_at 时间戳

### Requirement 6: 批量操作

**User Story:** 作为 API 用户，我希望能够批量创建交易记录，以便高效地导入历史数据。

#### Acceptance Criteria

1. WHEN 用户发送 POST 请求到 /api/trades/bulk 并提供交易记录数组 THEN THE API_Service SHALL 批量创建记录
2. WHEN 批量创建中部分记录验证失败 THEN THE API_Service SHALL 返回成功和失败记录的详细列表
3. WHEN 批量创建中所有记录验证失败 THEN THE API_Service SHALL 返回 400 状态码和所有错误信息
4. WHEN 批量创建过程中发生数据库错误 THEN THE API_Service SHALL 回滚所有更改
5. WHEN 批量创建成功 THEN THE API_Service SHALL 返回包含成功计数和创建记录列表的响应

### Requirement 7: 响应格式标准化

**User Story:** 作为 API 用户，我希望所有 API 响应遵循统一的格式，以便简化客户端处理逻辑。

#### Acceptance Criteria

1. WHEN API 操作成功 THEN THE API_Service SHALL 返回包含 success=true、data 和 message 字段的 JSON 对象
2. WHEN API 操作失败 THEN THE API_Service SHALL 返回包含 success=false、error 和 message 字段的 JSON 对象
3. WHEN API 返回列表数据 THEN THE API_Service SHALL 包含 pagination 对象，其中包含 total、page、page_size 和 total_pages
4. WHEN 发生验证错误 THEN THE API_Service SHALL 在 error 对象中包含详细的字段级错误信息
5. WHEN 发生服务器错误 THEN THE API_Service SHALL 返回通用错误信息而不暴露内部实现细节

### Requirement 8: 错误处理

**User Story:** 作为 API 用户，我希望收到清晰的错误信息，以便理解问题并采取正确的行动。

#### Acceptance Criteria

1. WHEN 请求数据验证失败 THEN THE API_Service SHALL 返回 400 状态码和详细的验证错误信息
2. WHEN 请求的资源不存在 THEN THE API_Service SHALL 返回 404 状态码和资源未找到的错误信息
3. WHEN 发生乐观锁版本冲突 THEN THE API_Service SHALL 返回 409 状态码和冲突错误信息
4. WHEN 业务逻辑验证失败 THEN THE API_Service SHALL 返回 422 状态码和业务错误信息
5. WHEN 发生未预期的服务器错误 THEN THE API_Service SHALL 返回 500 状态码和通用错误信息
6. WHEN 发生任何错误 THEN THE API_Service SHALL 记录详细的错误日志用于调试

### Requirement 9: CORS 配置

**User Story:** 作为前端开发者，我希望能够从不同域访问 API，以便在开发和生产环境中使用服务。

#### Acceptance Criteria

1. THE API_Service SHALL 配置 CORSMiddleware 以支持跨域请求
2. THE API_Service SHALL 从环境变量 ALLOWED_ORIGINS 读取允许的源列表
3. WHEN ALLOWED_ORIGINS 包含多个源 THEN THE API_Service SHALL 支持逗号分隔的源列表
4. THE API_Service SHALL 允许 GET、POST、PUT、DELETE 方法
5. THE API_Service SHALL 允许 Content-Type 和 Authorization 请求头
6. THE API_Service SHALL 支持 credentials（cookies 和认证信息）

### Requirement 10: 环境变量管理

**User Story:** 作为运维人员，我希望通过环境变量配置服务，以便在不同环境中灵活部署。

#### Acceptance Criteria

1. THE API_Service SHALL 从环境变量 DATABASE_URL 读取 PostgreSQL 连接字符串
2. THE API_Service SHALL 从环境变量 ALLOWED_ORIGINS 读取 CORS 配置
3. THE API_Service SHALL 从环境变量 PORT 读取服务端口，默认值为 8000
4. THE API_Service SHALL 从环境变量 LOG_LEVEL 读取日志级别，默认值为 INFO
5. WHEN 必需的环境变量未设置 THEN THE API_Service SHALL 在启动时失败并提供清晰的错误信息
6. THE API_Service SHALL 使用 python-dotenv 支持从 .env 文件加载环境变量

### Requirement 11: 健康检查

**User Story:** 作为运维人员，我希望能够检查服务健康状态，以便监控服务可用性。

#### Acceptance Criteria

1. WHEN 用户发送 GET 请求到 /health THEN THE API_Service SHALL 返回 200 状态码
2. WHEN 健康检查执行时 THEN THE API_Service SHALL 验证数据库连接是否正常
3. WHEN 数据库连接正常 THEN THE API_Service SHALL 返回包含 status=healthy 的响应
4. WHEN 数据库连接失败 THEN THE API_Service SHALL 返回 503 状态码和 status=unhealthy
5. WHEN 健康检查成功 THEN THE API_Service SHALL 包含服务版本和当前时间戳信息

### Requirement 12: 依赖注入和数据库会话管理

**User Story:** 作为开发者，我希望使用依赖注入管理数据库会话，以便确保资源正确释放和测试便利性。

#### Acceptance Criteria

1. THE API_Service SHALL 实现数据库会话依赖注入函数
2. WHEN API 端点需要数据库访问 THEN THE API_Service SHALL 通过依赖注入提供 Database_Session
3. WHEN 请求处理完成 THEN THE API_Service SHALL 自动关闭数据库会话
4. WHEN 请求处理中发生异常 THEN THE API_Service SHALL 回滚数据库事务并关闭会话
5. THE API_Service SHALL 使用 SQLAlchemy 2.0+ 的异步会话管理

### Requirement 13: 请求日志记录

**User Story:** 作为运维人员，我希望记录所有 API 请求，以便监控和调试服务。

#### Acceptance Criteria

1. WHEN API 收到请求 THEN THE API_Service SHALL 记录请求方法、路径和时间戳
2. WHEN API 返回响应 THEN THE API_Service SHALL 记录响应状态码和处理时间
3. WHEN 请求包含查询参数 THEN THE API_Service SHALL 记录查询参数（排除敏感信息）
4. WHEN 发生错误 THEN THE API_Service SHALL 记录完整的错误堆栈跟踪
5. THE API_Service SHALL 使用结构化日志格式便于日志分析

### Requirement 14: 部署配置

**User Story:** 作为运维人员，我希望服务能够轻松部署到 Railway 平台，以便快速上线。

#### Acceptance Criteria

1. THE API_Service SHALL 绑定到 0.0.0.0 地址以接受外部连接
2. THE API_Service SHALL 从环境变量 PORT 读取端口号
3. THE API_Service SHALL 提供 Procfile 文件用于 Railway 部署
4. THE API_Service SHALL 提供 requirements.txt 文件列出所有 Python 依赖
5. WHEN 服务启动时 THEN THE API_Service SHALL 输出启动信息和监听地址
6. THE API_Service SHALL 使用 uvicorn 作为 ASGI 服务器

### Requirement 15: 异步操作支持

**User Story:** 作为开发者，我希望使用异步操作提高服务性能，以便处理更多并发请求。

#### Acceptance Criteria

1. THE API_Service SHALL 使用 async/await 语法定义所有 API 端点
2. THE API_Service SHALL 使用 SQLAlchemy 的异步引擎和会话
3. WHEN 执行数据库查询 THEN THE API_Service SHALL 使用异步查询方法
4. WHEN 执行 I/O 操作 THEN THE API_Service SHALL 使用异步操作避免阻塞
5. THE API_Service SHALL 配置 uvicorn 使用适当的工作进程数

### Requirement 16: 动态规则库 API

**User Story:** 作为交易者，我希望通过 API 获取动态规则库数据（永久排除清单、正确行为清单、环境错配提醒），以便前端规则库面板展示实时规则。

#### Acceptance Criteria

1. WHEN 用户发送 GET 请求到 /api/rules/exclusions THEN THE API_Service SHALL 返回所有 permanent_exclusion_flag 为 true 的交易记录
2. WHEN 用户发送 GET 请求到 /api/rules/correct-behaviors THEN THE API_Service SHALL 返回所有 result_type 为"正确盈利"的交易记录
3. WHEN 用户发送 GET 请求到 /api/rules/environment-mismatches THEN THE API_Service SHALL 返回所有 environment_mismatch_flag 为 true 的交易记录
4. WHEN 用户发送 GET 请求到 /api/rules/summary THEN THE API_Service SHALL 返回规则库的汇总统计（各类规则数量、最近更新时间）
5. WHEN 查询规则库 THEN THE API_Service SHALL 自动排除已软删除的记录
6. WHEN 查询规则库 THEN THE API_Service SHALL 只返回当前用户的记录
