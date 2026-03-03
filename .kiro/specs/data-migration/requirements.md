# Requirements Document

## Introduction

本文档定义交易数据 CSV 导入/导出功能的需求。用户可以在本地环境导出完整交易记录为 CSV 文件，然后在线上环境通过 UI 导入，实现跨环境数据迁移。

## Glossary

- **Full CSV Export**: 包含所有 27 个表单字段的完整 CSV 导出
- **CSV Import**: 通过上传 CSV 文件批量创建交易记录

## Requirements

### Requirement 1: 完整 CSV 导出

**User Story:** 作为交易者，我希望导出包含所有字段的 CSV 文件，以便完整备份或迁移数据。

#### Acceptance Criteria

1. THE System SHALL 导出全部 27 个用户输入字段（对应新建交易 4 步表单）
2. THE System SHALL 使用 UTF-8 BOM 编码确保 Excel 兼容
3. THE System SHALL 使用中文表头便于阅读
4. WHEN 字段包含逗号时 THE System SHALL 使用双引号包裹
5. WHEN 字段为数组类型（选股维度、策略模式）时 THE System SHALL 用分号分隔

### Requirement 2: CSV 导入

**User Story:** 作为交易者，我希望通过上传 CSV 文件批量导入交易记录，以便从本地环境迁移数据到线上。

#### Acceptance Criteria

1. THE System SHALL 提供 `POST /api/trades/import` 端点接受 CSV 文件上传
2. THE System SHALL 逐行解析 CSV 并创建交易记录
3. WHEN CSV 中某行数据无效时 THE System SHALL 跳过该行并记录错误
4. THE System SHALL 返回导入结果（成功数、失败数、失败原因）
5. THE System SHALL 在前端交易列表页提供「导入 CSV」按钮

### Requirement 3: 导入/导出格式一致性

**User Story:** 作为交易者，我希望导出的 CSV 可以直接导入，以便数据无损迁移。

#### Acceptance Criteria

1. THE System SHALL 确保导出和导入使用相同的 CSV 表头和字段映射
2. THE System SHALL 导入时自动忽略系统字段（id, user_id, pnl_amount 等）
3. THE System SHALL 导入时自动将数据关联到当前登录用户
