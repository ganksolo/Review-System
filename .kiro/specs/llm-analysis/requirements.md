# Requirements Document

## Introduction

本文档定义了交易复盘系统的 LLM 分析引擎（llm-analysis）的功能需求。该引擎集成大语言模型（OpenAI/DeepSeek），对交易记录进行智能分析，生成归因分析和行动建议，帮助交易者识别交易中的认知偏差、执行错误和模式问题。

## Glossary

- **LLM_Engine**: 大语言模型分析引擎，负责调用 LLM API 并处理分析结果
- **Trade_Record**: 交易记录，包含交易的完整信息（买入论点、执行过程、结果等）
- **Attribution_Analysis**: 归因分析，识别交易结果的真实原因（技能 vs 运气）
- **Thesis_Statement**: 买入论点，交易者在开仓前的交易逻辑和假设
- **Result_Type**: 交易结果类型（正确盈利/运气盈利/执行亏损/模式亏损）
- **Error_Level**: 错误层级（执行层错误/模式层错误/环境层错误）
- **Environment_Mismatch**: 环境错配，策略与市场环境不匹配的情况
- **Permanent_Exclusion**: 永久排除，绝对错误的交易行为（如无止损、情绪化交易）
- **Action_Item**: 行动指令，基于分析结果生成的具体改进建议
- **Analysis_Status**: 分析状态（Pending/Processing/Completed/Failed）
- **API_Provider**: API 提供商（OpenAI/DeepSeek）
- **Retry_Mechanism**: 重试机制，API 调用失败时的自动重试逻辑
- **Token_Usage**: Token 使用量，LLM API 调用消耗的 token 数量
- **Structured_Output**: 结构化输出，LLM 返回的 JSON 格式响应

## Requirements

### Requirement 1: LLM API 集成

**User Story:** 作为系统管理员，我希望系统能够集成多个 LLM 提供商，以便根据成本和质量需求选择合适的模型。

#### Acceptance Criteria

1. WHEN the system initializes, THE LLM_Engine SHALL load API credentials from environment variables (LLM_API_KEY, LLM_API_BASE, LLM_MODEL)
2. THE LLM_Engine SHALL support OpenAI API (GPT-4, GPT-3.5-turbo)
3. THE LLM_Engine SHALL support DeepSeek API with custom endpoint configuration
4. WHEN LLM_API_BASE is not provided, THE LLM_Engine SHALL use the default OpenAI endpoint
5. WHEN API credentials are missing or invalid, THE LLM_Engine SHALL raise a configuration error with descriptive message

### Requirement 2: 请求可靠性保障

**User Story:** 作为系统开发者，我希望 API 调用具有重试和超时机制，以便处理网络波动和服务不稳定的情况。

#### Acceptance Criteria

1. WHEN an API request fails, THE LLM_Engine SHALL retry the request up to LLM_MAX_RETRIES times (default 3)
2. WHEN an API request exceeds LLM_TIMEOUT seconds (default 30), THE LLM_Engine SHALL terminate the request and mark it as timeout
3. WHEN all retry attempts fail, THE LLM_Engine SHALL log the error and update Analysis_Status to Failed
4. WHEN a retry succeeds, THE LLM_Engine SHALL log the retry count and proceed with the response
5. THE LLM_Engine SHALL implement exponential backoff between retry attempts (1s, 2s, 4s)

### Requirement 3: 买入论点分析

**User Story:** 作为交易者，我希望系统能够分析我的买入论点质量，以便识别逻辑漏洞和认知偏差。

#### Acceptance Criteria

1. WHEN analyzing a Trade_Record, THE LLM_Engine SHALL extract and analyze the Thesis_Statement field
2. THE LLM_Engine SHALL identify cognitive biases in the thesis (confirmation bias, anchoring effect, recency bias)
3. THE LLM_Engine SHALL evaluate the alignment between thesis logic and market environment
4. THE LLM_Engine SHALL generate a thesis quality score between 0 and 100
5. THE LLM_Engine SHALL store the analysis results in the llm_raw_log field as JSONB

### Requirement 4: 交易归因分析

**User Story:** 作为交易者，我希望系统能够区分交易结果中的技能因素和运气因素，以便准确评估我的交易能力。

#### Acceptance Criteria

1. WHEN analyzing a Trade_Record, THE LLM_Engine SHALL distinguish between skill-based outcomes and luck-based outcomes
2. THE LLM_Engine SHALL automatically set Result_Type to one of: 正确盈利, 运气盈利, 执行亏损, 模式亏损
3. THE LLM_Engine SHALL automatically set Error_Level to one of: 执行层错误, 模式层错误, 环境层错误, or null if no error
4. WHEN the trade was profitable due to correct analysis, THE LLM_Engine SHALL set Result_Type to 正确盈利
5. WHEN the trade was profitable despite flawed logic, THE LLM_Engine SHALL set Result_Type to 运气盈利

### Requirement 5: 环境错配检测

**User Story:** 作为交易者，我希望系统能够识别策略与市场环境的不匹配，以便避免在错误的场景使用正确的策略。

#### Acceptance Criteria

1. WHEN analyzing a Trade_Record, THE LLM_Engine SHALL evaluate the match between trading strategy and market environment
2. WHEN a valid strategy is applied in an inappropriate market condition, THE LLM_Engine SHALL set environment_mismatch_flag to true
3. WHEN environment mismatch is detected, THE LLM_Engine SHALL provide specific environment adaptation recommendations
4. THE LLM_Engine SHALL identify the expected market environment for the strategy
5. THE LLM_Engine SHALL identify the actual market environment during the trade

### Requirement 6: 永久排除判断

**User Story:** 作为交易者，我希望系统能够识别绝对错误的交易行为，以便建立明确的禁止清单。

#### Acceptance Criteria

1. WHEN analyzing a Trade_Record, THE LLM_Engine SHALL detect absolutely wrong trading behaviors
2. WHEN detecting no stop-loss, revenge trading, or emotion-driven decisions, THE LLM_Engine SHALL set permanent_exclusion_flag to true
3. WHEN permanent_exclusion_flag is set to true, THE LLM_Engine SHALL generate a warning message explaining the violation
4. THE LLM_Engine SHALL categorize the permanent exclusion reason (no_stop_loss, revenge_trading, emotional_trading, position_sizing_violation)
5. THE LLM_Engine SHALL store the permanent exclusion details in llm_raw_log

### Requirement 7: 行动指令生成

**User Story:** 作为交易者，我希望系统能够生成具体的改进建议，以便知道下一步应该如何优化交易系统。

#### Acceptance Criteria

1. WHEN analysis is completed, THE LLM_Engine SHALL generate short-term action items (what to do next week)
2. WHEN analysis is completed, THE LLM_Engine SHALL generate long-term optimization suggestions (system-level improvements)
3. THE LLM_Engine SHALL store action items in the llm_action_item field as structured text
4. WHEN multiple errors are detected, THE LLM_Engine SHALL prioritize action items by impact and urgency
5. THE LLM_Engine SHALL ensure action items are specific, measurable, and actionable

### Requirement 8: 批量分析能力

**User Story:** 作为交易者，我希望系统能够批量分析多条交易记录，以便识别系统性问题和重复性错误。

#### Acceptance Criteria

1. WHEN receiving multiple Trade_Records, THE LLM_Engine SHALL analyze them as a batch
2. THE LLM_Engine SHALL identify recurring patterns across multiple trades
3. THE LLM_Engine SHALL generate a system health report summarizing overall performance
4. THE LLM_Engine SHALL identify repeated mistakes across different trades
5. WHEN batch analysis is completed, THE LLM_Engine SHALL update Analysis_Status for all processed records

### Requirement 9: 分析状态管理

**User Story:** 作为系统开发者，我希望系统能够追踪每条交易记录的分析状态，以便监控分析进度和排查问题。

#### Acceptance Criteria

1. WHEN a Trade_Record is submitted for analysis, THE LLM_Engine SHALL set llm_analysis_status to Pending
2. WHEN analysis starts, THE LLM_Engine SHALL update llm_analysis_status to Processing
3. WHEN analysis completes successfully, THE LLM_Engine SHALL update llm_analysis_status to Completed
4. WHEN analysis fails, THE LLM_Engine SHALL update llm_analysis_status to Failed and log the error reason
5. THE LLM_Engine SHALL record analysis timestamp, model name, and token usage in llm_raw_log

### Requirement 10: Prompt 工程

**User Story:** 作为系统开发者，我希望系统使用结构化的 prompt 模板，以便获得一致和高质量的 LLM 响应。

#### Acceptance Criteria

1. THE LLM_Engine SHALL use structured prompt templates that include complete trade context
2. THE LLM_Engine SHALL include analysis framework and evaluation criteria in prompts
3. THE LLM_Engine SHALL use few-shot learning examples in prompts to guide LLM behavior
4. THE LLM_Engine SHALL request JSON format output from the LLM
5. WHEN LLM returns non-JSON output, THE LLM_Engine SHALL attempt to extract JSON or mark the response as invalid

### Requirement 11: 响应验证

**User Story:** 作为系统开发者，我希望系统能够验证 LLM 响应的格式和内容，以便确保数据质量。

#### Acceptance Criteria

1. WHEN receiving LLM response, THE LLM_Engine SHALL validate the response structure using Pydantic models
2. WHEN response validation fails, THE LLM_Engine SHALL log the validation error and retry the request
3. THE LLM_Engine SHALL verify that all required fields are present in the response
4. THE LLM_Engine SHALL verify that numeric scores are within valid ranges (0-100)
5. THE LLM_Engine SHALL verify that enum fields contain valid values

### Requirement 12: 错误处理

**User Story:** 作为系统开发者，我希望系统能够优雅地处理各种错误情况，以便提高系统稳定性。

#### Acceptance Criteria

1. WHEN API rate limit is exceeded, THE LLM_Engine SHALL wait for the specified retry-after period before retrying
2. WHEN API returns 5xx errors, THE LLM_Engine SHALL retry with exponential backoff
3. WHEN API returns 4xx errors (except 429), THE LLM_Engine SHALL log the error and mark analysis as Failed without retry
4. WHEN network connection fails, THE LLM_Engine SHALL retry up to LLM_MAX_RETRIES times
5. THE LLM_Engine SHALL log all errors with sufficient context for debugging

### Requirement 13: 成本控制

**User Story:** 作为系统管理员，我希望系统能够控制 LLM API 使用成本，以便在预算范围内运行。

#### Acceptance Criteria

1. THE LLM_Engine SHALL record token usage (prompt_tokens, completion_tokens, total_tokens) for each API call
2. WHEN LLM_MAX_TOKENS limit is specified, THE LLM_Engine SHALL enforce the limit in API requests
3. THE LLM_Engine SHALL support model selection based on cost-quality tradeoff (GPT-4 vs GPT-3.5-turbo)
4. THE LLM_Engine SHALL cache similar analysis results to reduce redundant API calls
5. THE LLM_Engine SHALL provide token usage statistics for monitoring and billing

### Requirement 14: 异步分析支持

**User Story:** 作为系统开发者，我希望系统支持异步分析任务，以便不阻塞主应用流程。

#### Acceptance Criteria

1. THE LLM_Engine SHALL support asynchronous analysis using message queues (Celery or RQ)
2. WHEN an async analysis task is submitted, THE LLM_Engine SHALL return a task ID immediately
3. THE LLM_Engine SHALL allow querying analysis progress using the task ID
4. WHEN async analysis completes, THE LLM_Engine SHALL support notification mechanisms (webhook, callback)
5. THE LLM_Engine SHALL handle task failures and support manual retry of failed tasks

### Requirement 15: 日志记录

**User Story:** 作为系统开发者，我希望系统记录详细的结构化日志，以便排查问题和优化性能。

#### Acceptance Criteria

1. THE LLM_Engine SHALL log all API requests with timestamp, model, prompt length, and parameters
2. THE LLM_Engine SHALL log all API responses with status code, token usage, and response time
3. THE LLM_Engine SHALL log all errors with stack traces and context information
4. THE LLM_Engine SHALL use structured logging format (JSON) for easy parsing and analysis
5. THE LLM_Engine SHALL support configurable log levels (DEBUG, INFO, WARNING, ERROR)

### Requirement 16: 测试支持

**User Story:** 作为系统开发者，我希望系统支持单元测试和集成测试，以便确保代码质量。

#### Acceptance Criteria

1. THE LLM_Engine SHALL support mock LLM responses for unit testing
2. THE LLM_Engine SHALL provide test fixtures for common Trade_Record scenarios
3. THE LLM_Engine SHALL support integration testing with real API calls in test environment
4. THE LLM_Engine SHALL validate that all error handling paths are testable
5. THE LLM_Engine SHALL achieve minimum 80% code coverage in tests
