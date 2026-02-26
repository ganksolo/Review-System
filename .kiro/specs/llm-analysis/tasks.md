# Implementation Plan: LLM Analysis Engine

## Overview

实现 LLM 驱动的交易归因分析引擎。从 Provider 抽象层开始，逐步实现 Prompt 管理、结构化输出解析、异步分析和成本追踪。

## Tasks

- [ ] 1. LLM Client 抽象层
  - [ ] 1.1 创建 `app/llm/client.py` — LLMClient 基类, OpenAI 实现, DeepSeek 实现
  - [ ] 1.2 实现重试逻辑（指数退避, 最多 3 次）
  - [ ] 1.3 实现超时管理 (30s)
  - [ ] 1.4 从环境变量读取配置 (LLM_API_KEY, LLM_MODEL, LLM_API_BASE)
  - _Requirements: 1.1-1.4, 2.1-2.5_

- [ ] 2. Prompt 管理
  - [ ] 2.1 创建 `app/llm/prompts.py` — 分析 prompt 模板
  - [ ] 2.2 实现模板变量注入 (trade data → prompt)
  - [ ] 2.3 添加 JSON Schema 约束指令
  - _Requirements: 10.1-10.4_

- [ ] 3. 结构化输出解析
  - [ ] 3.1 创建 `app/llm/schemas.py` — LLMAnalysisResult Pydantic 模型
  - [ ] 3.2 实现 JSON 解析 + 校验逻辑
  - [ ] 3.3 处理部分解析失败的降级
  - _Requirements: 11.1-11.4_

- [ ] 4. 核心分析引擎
  - [ ] 4.1 创建 `app/llm/analyzer.py` — TradeAnalyzer 类
  - [ ] 4.2 实现 analyze_trade(): 单条分析
  - [ ] 4.3 实现 analyze_batch(): 批量分析 (并行 + 限流)
  - [ ] 4.4 实现分析结果写回 Trade 模型 (result_type, error_level, flags, action_item)
  - [ ] 4.5 更新 llm_analysis_status 状态 (Pending → Processing → Completed/Failed)
  - _Requirements: 3.1-3.6, 4.1-4.3, 5.1-5.3, 6.1-6.3, 7.1-7.4, 8.1-8.3, 9.1-9.3_

- [ ] 5. 成本追踪
  - [ ] 5.1 创建 `app/llm/cost_tracker.py` — Token 用量记录
  - [ ] 5.2 实现日/周/月汇总
  - [ ] 5.3 实现缓存策略（相似交易跳过重复分析）
  - _Requirements: 13.1-13.4_

- [ ] 6. 异步任务支持
  - [ ] 6.1 创建 `app/llm/tasks.py` — 后台分析任务
  - [ ] 6.2 实现 API 端点触发异步分析
  - _Requirements: 14.1-14.4_

- [ ] 7. 测试
  - [ ] 7.1 Mock LLM Client 单元测试
  - [ ] 7.2 Prompt 模板测试
  - [ ] 7.3 结构化解析测试
  - [ ] 7.4 分析流程集成测试 (with mock)
  - _Requirements: 16.1-16.4_
