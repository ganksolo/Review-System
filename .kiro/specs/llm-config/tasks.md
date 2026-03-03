# Implementation Plan: LLM Config Management

## Overview

实现 LLM 模型配置的动态管理。用户通过 Dialog 配置 API Key / Base URL / Model Name，后端加密存储，LLM 调用时解密使用，支持 fallback 到环境变量。

## Tasks

- [x] 1. 数据库模型与迁移
  - [x] 1.1 创建 `app/models/llm_config.py` — LLMConfig ORM 模型
  - [x] 1.2 注册模型到 `app/models/__init__.py`
  - [x] 1.3 生成并执行 Alembic 迁移
  - _Requirements: 1.1-1.5_

- [x] 2. 加密工具
  - [x] 2.1 添加 `cryptography` 依赖
  - [x] 2.2 创建 `app/core/encryption.py` — Fernet 加密/解密/脱敏
  - [x] 2.3 `config.py` 新增 `ENCRYPTION_KEY` 配置项
  - _Requirements: 2.1-2.5_

- [x] 3. API 端点
  - [x] 3.1 创建 `app/schemas/llm_config.py` — Pydantic 请求/响应 schema
  - [x] 3.2 创建 `app/api/routes/llm_config.py` — GET/POST/PUT/DELETE 端点
  - [x] 3.3 注册路由到 `app/main.py`
  - _Requirements: 1.1-1.5, 2.3-2.4_

- [x] 4. LLM Client 降级集成
  - [x] 4.1 修改 `app/llm/client.py` — 支持动态配置 (从 DB 或 env 获取)
  - [x] 4.2 修改 `app/llm/analyzer.py` — 分析时传入 user_id 获取配置
  - _Requirements: 3.1-3.3_

- [x] 5. 前端 Dialog
  - [x] 5.1 `api.ts` 新增 llmConfigApi 封装
  - [x] 5.2 创建 `LLMConfigDialog` 组件
  - [x] 5.3 侧边栏新增 AI 配置入口图标 (Settings)
  - _Requirements: 4.1-4.5_

- [x] 6. 文档更新
  - [x] 6.1 更新 `.env.example` 添加 ENCRYPTION_KEY
  - [x] 6.2 更新 `DATABASE_SCHEMA.md`
  - [x] 6.3 更新 `README.md`
