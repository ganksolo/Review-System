# Implementation Plan: LLM Analysis Engine

## Overview

实现 LLM 驱动的交易归因分析引擎。从 Provider 抽象层开始，逐步实现 Prompt 管理、结构化输出解析、异步分析和成本追踪。

## Tasks

- [x] 1. LLM Client 抽象层
  - [x] 1.1 创建 `app/llm/client.py` — LLMClient 基类, OpenRouter 实现 (AsyncOpenAI SDK)
  - [x] 1.2 实现重试逻辑（由 OpenAI SDK 内置指数退避, 最多 3 次）
  - [x] 1.3 实现超时管理 (60s)
  - [x] 1.4 从环境变量读取配置 (LLM_API_KEY, LLM_MODEL, LLM_API_BASE)
  - _Requirements: 1.1-1.4, 2.1-2.5_

- [x] 2. Prompt 管理
  - [x] 2.1 创建 `app/llm/prompts.py` — 分析 prompt 模板
  - [x] 2.2 实现模板变量注入 (trade data → prompt)
  - [x] 2.3 添加 JSON Schema 约束指令（从 Pydantic model_json_schema 自动生成）
  - _Requirements: 10.1-10.4_

- [x] 3. 结构化输出解析
  - [x] 3.1 创建 `app/llm/schemas.py` — LLMAnalysisResult Pydantic 模型
  - [x] 3.2 实现 JSON 解析 + 校验逻辑 (model_validate_json)
  - [x] 3.3 处理部分解析失败的降级（catch Exception → fail_llm_analysis）
  - _Requirements: 11.1-11.4_

- [x] 4. 核心分析引擎
  - [x] 4.1 创建 `app/llm/analyzer.py` — TradeAnalyzer 类
  - [x] 4.2 实现 analyze_trade(): 单条分析
  - [x] 4.3 实现 analyze_batch(): 批量分析 (并行 + 限流)
  - [x] 4.4 实现分析结果写回 Trade 模型 (result_type, error_level, flags, action_item)
  - [x] 4.5 更新 llm_analysis_status 状态 (Pending → Processing → Completed/Failed)
  - _Requirements: 3.1-3.6, 4.1-4.3, 5.1-5.3, 6.1-6.3, 7.1-7.4, 8.1-8.3, 9.1-9.3_

- [x] 5. 成本追踪
  - [x] 5.1 创建 `app/llm/cost_tracker.py` — Token 用量记录
  - [x] 5.2 实现日/周/月汇总（当前为内存汇总，含最近 20 条记录）
  - [x] 5.3 实现缓存策略（相似交易跳过重复分析）
  - _Requirements: 13.1-13.4_

- [x] 6. 异步任务支持
  - [x] 6.1 创建 `app/api/routes/llm.py` — LLM API 路由
  - [x] 6.2 实现 API 端点触发分析 (POST /api/trades/{id}/analyze)
  - _Requirements: 14.1-14.4_

- [x] 7. 测试
  - [x] 7.1 Mock LLM Client 单元测试
  - [x] 7.2 Prompt 模板测试
  - [x] 7.3 结构化解析测试
  - [x] 7.4 分析流程集成测试 (with mock)
  - _Requirements: 16.1-16.4_
