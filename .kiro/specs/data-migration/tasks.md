# Implementation Plan: Data Migration (CSV Import/Export)

## Overview

完善 CSV 导出并新增 CSV 导入功能，支持跨环境数据迁移。

## Tasks

- [x] 1. 完善 CSV 导出
  - [x] 1.1 修改 `exportCSV()` 包含全部 30 列（27 个表单字段 + 环境错配/永久排除/正确行为）
  - [x] 1.2 数组字段用分号分隔，文本字段用双引号包裹
  - _Requirements: 1.1-1.5_

- [x] 2. 后端 CSV 导入 API
  - [x] 2.1 创建 `POST /api/trades/import` 端点，接受 multipart/form-data 文件上传
  - [x] 2.2 CSV 中文表头 → TradeCreate 字段映射 (CSV_HEADER_MAP)
  - [x] 2.3 逐行解析 + 类型转换 + 错误收集
  - [x] 2.4 返回导入结果统计 (success_count, failure_count, failures)
  - _Requirements: 2.1-2.4_

- [x] 3. 前端导入 UI
  - [x] 3.1 交易列表页新增「导入 CSV」按钮 (Upload icon)
  - [x] 3.2 文件上传 + 导入结果 banner 展示
  - _Requirements: 2.5, 3.1-3.3_
