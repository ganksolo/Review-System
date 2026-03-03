# Requirements Document

## Introduction

本文档定义了 LLM 模型配置管理功能的需求。用户可以通过前端 UI 动态配置 LLM Provider（API Key、Base URL、Model Name），无需修改 .env 文件或重新部署。API Key 使用 AES 加密存储，保障安全性。

## Glossary

- **LLM_Config**: LLM 模型配置记录，包含 provider、加密的 API Key、Base URL、Model Name
- **Provider**: LLM API 提供商（openai / deepseek / anthropic / custom）
- **ENCRYPTION_KEY**: Fernet 对称加密主密钥，从环境变量读取
- **Fallback**: 降级策略，DB 配置不存在时使用环境变量配置

## Requirements

### Requirement 1: LLM 配置 CRUD

**User Story:** 作为交易者，我希望能在 UI 中配置 LLM 模型信息，以便无需修改代码即可切换 AI 模型。

#### Acceptance Criteria

1. THE System SHALL 提供 `POST /api/llm-config` 端点创建或更新配置
2. THE System SHALL 提供 `GET /api/llm-config` 端点获取当前活跃配置（API Key 脱敏显示）
3. THE System SHALL 提供 `DELETE /api/llm-config/{id}` 端点删除配置
4. THE System SHALL 每个用户仅允许一条活跃配置（is_active=true）
5. WHEN 创建新配置时 THE System SHALL 自动停用该用户的其他配置

### Requirement 2: API Key 加密存储

**User Story:** 作为交易者，我希望 API Key 加密存储在数据库中，以便密钥不出现在代码或日志中。

#### Acceptance Criteria

1. THE System SHALL 使用 Fernet 对称加密存储 API Key
2. THE System SHALL 从环境变量 `ENCRYPTION_KEY` 读取加密主密钥
3. WHEN 返回配置信息时 THE System SHALL 对 API Key 脱敏（仅显示前4位和后4位）
4. THE System SHALL 在调用 LLM API 时实时解密 API Key
5. WHEN `ENCRYPTION_KEY` 未配置时 THE System SHALL 拒绝启动并报告错误

### Requirement 3: 配置降级策略

**User Story:** 作为系统管理员，我希望在用户未配置 DB 中的 LLM 信息时系统仍可使用环境变量配置，以便兼容旧的部署方式。

#### Acceptance Criteria

1. WHEN 用户在 DB 中有活跃配置时 THE System SHALL 优先使用 DB 配置
2. WHEN 用户在 DB 中无配置时 THE System SHALL 降级使用环境变量配置
3. WHEN 环境变量也未配置时 THE System SHALL 返回错误提示用户配置 LLM

### Requirement 4: 前端配置 Dialog

**User Story:** 作为交易者，我希望通过弹窗快速配置 AI 模型，以便不离开当前页面即可完成设置。

#### Acceptance Criteria

1. THE System SHALL 在侧边栏提供 AI 配置入口图标
2. THE System SHALL 提供 Dialog 表单包含: Provider 选择、API Key、Base URL、Model Name
3. WHEN 已有配置时 THE Dialog SHALL 回填现有配置（API Key 脱敏显示）
4. WHEN 保存成功时 THE Dialog SHALL 关闭并显示成功提示
5. THE Dialog SHALL 提供删除配置的功能
