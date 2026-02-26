# Requirements Document

## Introduction

本文档定义交易复盘系统的数据库架构需求。系统需要存储和管理交易记录，支持多维度的交易分析、归因和系统迭代优化。数据库采用 PostgreSQL，使用 SQLAlchemy ORM 进行数据访问。

## Glossary

- **Trade_System**: 交易复盘系统，负责存储、管理和分析交易数据
- **Trade_Record**: 单条交易记录，包含从开仓到平仓的完整信息
- **Database**: PostgreSQL 数据库实例
- **ORM**: SQLAlchemy 对象关系映射层
- **Soft_Delete**: 软删除机制，通过 deleted_at 字段标记删除而非物理删除
- **Optimistic_Lock**: 乐观锁机制，通过 version 字段防止并发冲突
- **LLM_Analyzer**: 大语言模型分析器，负责生成交易分析和行动建议
- **User**: 系统用户，拥有多个交易账户

## Requirements

### Requirement 1: 系统标识与主键管理

**User Story:** 作为系统架构师，我希望每条交易记录有唯一标识，以便在分布式环境中准确追踪和引用交易数据。

#### Acceptance Criteria

1. THE Trade_System SHALL use UUID v4 as the primary key for all trade records
2. WHEN a new trade record is created, THE Trade_System SHALL generate a unique UUID v4 identifier
3. THE Trade_System SHALL associate each trade record with a user identifier
4. WHEN querying by primary key, THE Trade_System SHALL return at most one trade record

### Requirement 2: 时间戳与审计追踪

**User Story:** 作为数据分析师，我希望追踪每条记录的创建和修改时间，以便进行时序分析和审计。

#### Acceptance Criteria

1. WHEN a trade record is created, THE Trade_System SHALL automatically set created_at to the current timestamp
2. WHEN a trade record is updated, THE Trade_System SHALL automatically update the updated_at timestamp
3. THE Trade_System SHALL store all timestamps in UTC timezone
4. THE Trade_System SHALL maintain created_at as immutable after initial creation
5. WHEN a trade record is deleted, THE Trade_System SHALL set deleted_at to the current timestamp and preserve the record

### Requirement 3: 软删除机制

**User Story:** 作为系统管理员，我希望删除的数据可以恢复，以便处理误删除情况和满足审计要求。

#### Acceptance Criteria

1. WHEN a trade record is deleted, THE Trade_System SHALL set the deleted_at field instead of removing the record
2. WHEN querying trade records, THE Trade_System SHALL exclude records where deleted_at is not null by default
3. WHEN explicitly requested, THE Trade_System SHALL return deleted records for audit purposes
4. THE Trade_System SHALL preserve all field values when a record is soft-deleted

### Requirement 4: 乐观锁并发控制

**User Story:** 作为开发者，我希望防止并发更新冲突，以便支持多端同步场景。

#### Acceptance Criteria

1. THE Trade_System SHALL maintain a version number for each trade record starting at 1
2. WHEN a trade record is updated, THE Trade_System SHALL increment the version number by 1
3. WHEN an update is attempted with an outdated version number, THE Trade_System SHALL reject the update and return a conflict error
4. THE Trade_System SHALL include the current version number in all read responses

### Requirement 5: LLM 分析状态管理

**User Story:** 作为交易分析师，我希望追踪 LLM 分析的处理状态，以便了解哪些交易已完成智能分析。

#### Acceptance Criteria

1. THE Trade_System SHALL support four LLM analysis states: Pending, Processing, Completed, Failed
2. WHEN a new trade record is created, THE Trade_System SHALL set llm_analysis_status to Pending
3. WHEN LLM analysis begins, THE Trade_System SHALL update llm_analysis_status to Processing
4. WHEN LLM analysis succeeds, THE Trade_System SHALL update llm_analysis_status to Completed
5. WHEN LLM analysis fails, THE Trade_System SHALL update llm_analysis_status to Failed
6. THE Trade_System SHALL store the raw LLM response in llm_raw_log as JSONB format

### Requirement 6: 基础交易信息存储

**User Story:** 作为交易员，我希望记录交易的基本信息，以便回顾交易执行情况。

#### Acceptance Criteria

1. THE Trade_System SHALL store account_type as either 短线账户 or 中线账户
2. THE Trade_System SHALL store stock_code and stock_name as string fields
3. THE Trade_System SHALL store trade_cycle as one of: 短线, 中线, 长线
4. THE Trade_System SHALL store entry_date and exit_date as timestamp fields
5. WHEN exit_date is before entry_date, THE Trade_System SHALL reject the trade record
6. THE Trade_System SHALL store position_size, entry_price, and exit_price as floating-point numbers
7. WHEN position_size, entry_price, or exit_price is negative, THE Trade_System SHALL reject the trade record

### Requirement 7: 风控参数存储

**User Story:** 作为风险管理者，我希望记录预设的止损止盈位，以便评估风控纪律执行情况。

#### Acceptance Criteria

1. THE Trade_System SHALL store preset_stop_loss and preset_take_profit as floating-point numbers
2. THE Trade_System SHALL allow preset_stop_loss and preset_take_profit to be null
3. THE Trade_System SHALL store slippage as a floating-point number
4. THE Trade_System SHALL store max_favorable_excursion and max_adverse_excursion as floating-point numbers
5. THE Trade_System SHALL allow max_favorable_excursion and max_adverse_excursion to be null

### Requirement 8: 盈亏计算与分类

**User Story:** 作为交易员，我希望系统记录盈亏金额和比例，以便快速评估交易结果。

#### Acceptance Criteria

1. THE Trade_System SHALL store pnl_amount as a floating-point number
2. THE Trade_System SHALL store pnl_ratio as a floating-point number representing percentage
3. THE Trade_System SHALL classify each trade with pnl_flag as one of: 盈利, 亏损, 保本出局
4. WHEN pnl_amount is positive, THE Trade_System SHALL set pnl_flag to 盈利
5. WHEN pnl_amount is negative, THE Trade_System SHALL set pnl_flag to 亏损
6. WHEN pnl_amount is zero or near-zero, THE Trade_System SHALL set pnl_flag to 保本出局

### Requirement 9: 市场环境快照

**User Story:** 作为策略研究员，我希望记录交易时的市场环境，以便分析不同市场状态下的策略表现。

#### Acceptance Criteria

1. THE Trade_System SHALL store market_environment as one of: 牛市-主升, 牛市-调整, 熊市-主跌, 熊市-反弹, 震荡市-上轨, 震荡市-下轨, 震荡市-中枢
2. THE Trade_System SHALL store sector_status as one of: 启动期, 主升期, 高潮期, 退潮期, 混沌期
3. THE Trade_System SHALL allow market_environment and sector_status to be null for incomplete records
4. THE Trade_System SHALL create an index on market_environment for efficient filtering

### Requirement 10: 选股维度与策略模式

**User Story:** 作为交易员，我希望记录选股依据和使用的策略模式，以便总结有效的交易方法论。

#### Acceptance Criteria

1. THE Trade_System SHALL store selection_dimension as an array or tags supporting multiple values from: 技术面, 政策面, 基本面, 事件驱动, 情绪接力
2. THE Trade_System SHALL store strategy_pattern as an array or tags supporting multiple values from: 突破买入, 回踩低吸, 龙头首阴
3. THE Trade_System SHALL allow selection_dimension and strategy_pattern to contain multiple values simultaneously
4. THE Trade_System SHALL store volume_profile as a string field
5. THE Trade_System SHALL store thesis_statement as a text field for detailed entry rationale

### Requirement 11: 执行纪律评估

**User Story:** 作为交易教练，我希望评估交易员的执行纪律，以便识别需要改进的行为模式。

#### Acceptance Criteria

1. THE Trade_System SHALL store plan_adherence as one of: 完全按计划, 轻微偏离, 临盘起意冲动交易
2. THE Trade_System SHALL store stop_loss_discipline as one of: 有预设并严格执行, 有预设但未执行, 无预设止损
3. THE Trade_System SHALL store exit_type as one of: 主动止盈, 被动止损, 保本出局, 模式外情绪化离场
4. THE Trade_System SHALL store exit_reason as a text field
5. THE Trade_System SHALL store psychological_state as one of: 冷静, 追涨FOMO, 贪婪, 恐惧

### Requirement 12: 深度归因分类

**User Story:** 作为系统优化者，我希望对交易结果进行深度归因，以便区分运气、执行和模式的影响。

#### Acceptance Criteria

1. THE Trade_System SHALL store result_type as one of: 正确盈利, 运气盈利, 执行亏损, 模式亏损
2. THE Trade_System SHALL store error_level as one of: 执行层错误, 模式层错误, 环境层错误
3. THE Trade_System SHALL allow result_type and error_level to be null
4. THE Trade_System SHALL create an index on result_type for efficient filtering

### Requirement 13: 系统迭代与行动指令

**User Story:** 作为交易员，我希望记录每次交易的改进行动，以便持续优化交易系统。

#### Acceptance Criteria

1. THE Trade_System SHALL require correct_action field to be non-null and non-empty for all trade records
2. THE Trade_System SHALL store correct_action as a text field
3. THE Trade_System SHALL store llm_action_item as a text field for LLM-generated recommendations
4. THE Trade_System SHALL allow llm_action_item to be null when LLM analysis is not completed
5. THE Trade_System SHALL store environment_mismatch_flag as a boolean field
6. THE Trade_System SHALL store permanent_exclusion_flag as a boolean field

### Requirement 14: 数据库索引优化

**User Story:** 作为系统性能工程师，我希望优化常用查询的性能，以便快速检索和分析交易数据。

#### Acceptance Criteria

1. THE Trade_System SHALL create an index on stock_code for stock-based queries
2. THE Trade_System SHALL create an index on entry_date for time-based queries
3. THE Trade_System SHALL create an index on market_environment for environment-based filtering
4. THE Trade_System SHALL create an index on result_type for result-based analysis
5. THE Trade_System SHALL create a composite index on user_id and deleted_at for user-specific active record queries

### Requirement 15: 数据完整性约束

**User Story:** 作为数据库管理员，我希望确保数据完整性，以便防止无效数据进入系统。

#### Acceptance Criteria

1. THE Trade_System SHALL enforce non-null constraints on id, user_id, created_at, and correct_action
2. WHEN entry_price is zero or negative, THE Trade_System SHALL reject the trade record
3. WHEN exit_price is zero or negative, THE Trade_System SHALL reject the trade record
4. WHEN position_size is zero or negative, THE Trade_System SHALL reject the trade record
5. THE Trade_System SHALL enforce foreign key constraint on user_id if a users table exists

### Requirement 16: JSONB 数据存储

**User Story:** 作为开发者，我希望灵活存储 LLM 的原始响应，以便未来扩展分析能力而不修改表结构。

#### Acceptance Criteria

1. THE Trade_System SHALL store llm_raw_log as JSONB data type
2. WHEN storing LLM responses, THE Trade_System SHALL validate that the data is valid JSON
3. THE Trade_System SHALL allow querying within llm_raw_log using PostgreSQL JSONB operators
4. THE Trade_System SHALL allow llm_raw_log to be null when LLM analysis has not been performed

### Requirement 17: 数组与标签字段支持

**User Story:** 作为交易分析师，我希望为单次交易标记多个选股维度和策略模式，以便分析复合策略的效果。

#### Acceptance Criteria

1. THE Trade_System SHALL support storing multiple values in selection_dimension field
2. THE Trade_System SHALL support storing multiple values in strategy_pattern field
3. WHEN querying by a specific dimension or pattern, THE Trade_System SHALL return all records containing that value
4. THE Trade_System SHALL allow selection_dimension and strategy_pattern to be empty arrays

### Requirement 18: SQLAlchemy ORM 模型定义

**User Story:** 作为后端开发者，我希望使用 SQLAlchemy ORM 访问数据库，以便编写类型安全和可维护的数据访问代码。

#### Acceptance Criteria

1. THE ORM SHALL define a Trade model class mapping to the trades table
2. THE ORM SHALL define Python Enum types for all enumeration fields
3. THE ORM SHALL implement automatic timestamp updates for updated_at field
4. THE ORM SHALL provide type hints for all model fields
5. THE ORM SHALL implement soft delete query filters as default query behavior

### Requirement 19: 数据迁移与版本控制

**User Story:** 作为 DevOps 工程师，我希望使用数据库迁移工具管理表结构变更，以便安全地演进数据库架构。

#### Acceptance Criteria

1. THE Trade_System SHALL use Alembic for database migration management
2. WHEN the schema is first deployed, THE Trade_System SHALL create the trades table with all specified fields
3. WHEN the schema is updated, THE Trade_System SHALL generate migration scripts that preserve existing data
4. THE Trade_System SHALL support rollback of schema changes

### Requirement 20: 查询性能要求

**User Story:** 作为系统用户，我希望常用查询能快速返回结果，以便流畅地进行交易复盘分析。

#### Acceptance Criteria

1. WHEN querying trades by stock_code, THE Trade_System SHALL return results within 100ms for datasets up to 100,000 records
2. WHEN querying trades by date range, THE Trade_System SHALL return results within 200ms for datasets up to 100,000 records
3. WHEN filtering by market_environment or result_type, THE Trade_System SHALL utilize indexes for query optimization
4. WHEN querying a user's active trades, THE Trade_System SHALL use the composite index on user_id and deleted_at

### Requirement 21: 数据验证与约束

**User Story:** 作为数据质量工程师，我希望在数据库层面强制执行业务规则，以便确保数据一致性。

#### Acceptance Criteria

1. WHEN pnl_amount is calculated, THE Trade_System SHALL ensure it equals (exit_price - entry_price) * position_size minus slippage
2. WHEN pnl_ratio is calculated, THE Trade_System SHALL ensure it represents the percentage return relative to entry value
3. IF preset_stop_loss is provided, THEN THE Trade_System SHALL ensure it is less than entry_price for long positions
4. IF preset_take_profit is provided, THEN THE Trade_System SHALL ensure it is greater than entry_price for long positions
5. THE Trade_System SHALL ensure version number is always positive

### Requirement 22: 枚举值完整性

**User Story:** 作为开发者，我希望所有枚举字段只接受预定义的值，以便保证数据分类的一致性。

#### Acceptance Criteria

1. THE Trade_System SHALL reject any account_type value not in the defined enum set
2. THE Trade_System SHALL reject any trade_cycle value not in the defined enum set
3. THE Trade_System SHALL reject any pnl_flag value not in the defined enum set
4. THE Trade_System SHALL reject any market_environment value not in the defined enum set
5. THE Trade_System SHALL reject any sector_status value not in the defined enum set
6. THE Trade_System SHALL reject any plan_adherence value not in the defined enum set
7. THE Trade_System SHALL reject any stop_loss_discipline value not in the defined enum set
8. THE Trade_System SHALL reject any exit_type value not in the defined enum set
9. THE Trade_System SHALL reject any psychological_state value not in the defined enum set
10. THE Trade_System SHALL reject any result_type value not in the defined enum set
11. THE Trade_System SHALL reject any error_level value not in the defined enum set
12. THE Trade_System SHALL reject any llm_analysis_status value not in the defined enum set

### Requirement 23: 必填字段验证

**User Story:** 作为数据分析师，我希望关键字段始终有值，以便确保分析的完整性。

#### Acceptance Criteria

1. THE Trade_System SHALL require correct_action to be non-null and contain at least one non-whitespace character
2. THE Trade_System SHALL require stock_code to be non-null and non-empty
3. THE Trade_System SHALL require entry_date to be non-null
4. THE Trade_System SHALL require entry_price to be non-null
5. THE Trade_System SHALL require position_size to be non-null

### Requirement 24: 数据类型精度

**User Story:** 作为财务分析师，我希望价格和金额字段有足够的精度，以便准确计算盈亏。

#### Acceptance Criteria

1. THE Trade_System SHALL store all price fields (entry_price, exit_price, preset_stop_loss, preset_take_profit) with at least 4 decimal places precision
2. THE Trade_System SHALL store pnl_amount with at least 2 decimal places precision
3. THE Trade_System SHALL store pnl_ratio with at least 4 decimal places precision
4. THE Trade_System SHALL store slippage with at least 4 decimal places precision

### Requirement 25: 批量操作支持

**User Story:** 作为系统管理员，我希望支持批量导入和更新交易记录，以便高效地迁移历史数据。

#### Acceptance Criteria

1. THE Trade_System SHALL support bulk insert operations for multiple trade records
2. WHEN performing bulk operations, THE Trade_System SHALL validate each record independently
3. WHEN a bulk operation contains invalid records, THE Trade_System SHALL report which records failed validation
4. THE Trade_System SHALL support transactional bulk operations that can be rolled back on error

### Requirement 26: 查询过滤器

**User Story:** 作为交易分析师，我希望按多个维度过滤交易记录，以便进行细分分析。

#### Acceptance Criteria

1. THE Trade_System SHALL support filtering by date range (entry_date and exit_date)
2. THE Trade_System SHALL support filtering by stock_code
3. THE Trade_System SHALL support filtering by market_environment
4. THE Trade_System SHALL support filtering by result_type
5. THE Trade_System SHALL support filtering by pnl_flag
6. THE Trade_System SHALL support combining multiple filters in a single query
7. WHEN multiple filters are applied, THE Trade_System SHALL return records matching all filter conditions

### Requirement 27: 数据导出与序列化

**User Story:** 作为数据分析师，我希望将交易数据导出为标准格式，以便使用外部工具进行分析。

#### Acceptance Criteria

1. THE Trade_System SHALL support serializing trade records to JSON format
2. WHEN serializing to JSON, THE Trade_System SHALL convert all datetime fields to ISO 8601 format
3. WHEN serializing to JSON, THE Trade_System SHALL convert all enum fields to their string representations
4. THE Trade_System SHALL support deserializing JSON data back to trade record objects
5. FOR ALL valid trade records, serializing then deserializing SHALL produce an equivalent record

### Requirement 28: 表结构文档化

**User Story:** 作为新加入的开发者，我希望有清晰的表结构文档，以便快速理解数据模型。

#### Acceptance Criteria

1. THE Trade_System SHALL include inline comments in the ORM model describing each field's purpose
2. THE Trade_System SHALL document all enum value meanings
3. THE Trade_System SHALL document the relationship between fields (e.g., pnl_amount calculation)
4. THE Trade_System SHALL document all indexes and their query optimization purposes
