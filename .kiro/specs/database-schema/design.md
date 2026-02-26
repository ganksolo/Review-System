# Design Document: Database Schema for Trading Review System

## Overview

本设计文档描述交易复盘系统的 PostgreSQL 数据库架构实现。系统使用 SQLAlchemy ORM 提供类型安全的数据访问层，支持软删除、乐观锁并发控制、LLM 分析集成和多维度交易分析。

核心设计目标：
- 完整记录交易生命周期的所有关键信息
- 支持多维度的交易分析和归因
- 提供高性能的查询能力
- 确保数据完整性和并发安全
- 支持未来扩展而不破坏现有结构

## Architecture

### Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0+
- **Migration Tool**: Alembic
- **Python Version**: 3.10+

### Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                   (Python + SQLAlchemy)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ORM Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Trade Model  │  │ Enums        │  │ Validators   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              trades table (主表)                      │  │
│  │  - 模块 0: 系统、安全与日志审计                       │  │
│  │  - 模块 1: 基础交易事实与风控                         │  │
│  │  - 模块 2: 决策环境快照                              │  │
│  │  - 模块 3: 执行与心理评估                            │  │
│  │  - 模块 4: 深度归因与系统迭代                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Indexes:                                                    │
│  - idx_trades_stock_code                                     │
│  - idx_trades_entry_date                                     │
│  - idx_trades_market_environment                             │
│  - idx_trades_result_type                                    │
│  - idx_trades_user_deleted (composite)                       │
└─────────────────────────────────────────────────────────────┘
```

### Module Organization

数据库表按 5 个逻辑模块组织：

1. **模块 0 - 系统、安全与日志审计**: 主键、用户标识、时间戳、版本控制、LLM 状态
2. **模块 1 - 基础交易事实与风控**: 账户类型、股票信息、交易周期、价格、仓位、止损止盈
3. **模块 2 - 决策环境快照**: 市场环境、板块状态、选股维度、策略模式、买入论点
4. **模块 3 - 执行与心理评估**: 计划执行、止损纪律、离场类型、心理状态
5. **模块 4 - 深度归因与系统迭代**: 结果分类、错误层级、改进行动、LLM 建议

## Components and Interfaces

### 1. Trade Model (SQLAlchemy ORM)

核心 ORM 模型类，映射到 `trades` 表。

```python
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid
import enum

Base = declarative_base()

class Trade(Base):
    __tablename__ = 'trades'
    
    # 模块 0: 系统、安全与日志审计
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    llm_analysis_status = Column(SQLEnum(LLMAnalysisStatus), nullable=False, default=LLMAnalysisStatus.PENDING)
    llm_raw_log = Column(JSONB, nullable=True)
    
    # 模块 1: 基础交易事实与风控
    account_type = Column(SQLEnum(AccountType), nullable=False)
    stock_code = Column(String(20), nullable=False, index=True)
    stock_name = Column(String(100), nullable=True)
    trade_cycle = Column(SQLEnum(TradeCycle), nullable=False)
    entry_date = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    exit_date = Column(TIMESTAMP(timezone=True), nullable=True)
    position_size = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    preset_stop_loss = Column(Float, nullable=True)
    preset_take_profit = Column(Float, nullable=True)
    slippage = Column(Float, nullable=True, default=0.0)
    max_favorable_excursion = Column(Float, nullable=True)
    max_adverse_excursion = Column(Float, nullable=True)
    pnl_amount = Column(Float, nullable=True)
    pnl_ratio = Column(Float, nullable=True)
    pnl_flag = Column(SQLEnum(PnLFlag), nullable=True)
    
    # 模块 2: 决策环境快照
    market_environment = Column(SQLEnum(MarketEnvironment), nullable=True, index=True)
    sector_status = Column(SQLEnum(SectorStatus), nullable=True)
    selection_dimension = Column(ARRAY(String), nullable=True)
    strategy_pattern = Column(ARRAY(String), nullable=True)
    volume_profile = Column(String(500), nullable=True)
    thesis_statement = Column(Text, nullable=True)
    
    # 模块 3: 执行与心理评估
    plan_adherence = Column(SQLEnum(PlanAdherence), nullable=True)
    stop_loss_discipline = Column(SQLEnum(StopLossDiscipline), nullable=True)
    exit_type = Column(SQLEnum(ExitType), nullable=True)
    exit_reason = Column(Text, nullable=True)
    psychological_state = Column(SQLEnum(PsychologicalState), nullable=True)
    
    # 模块 4: 深度归因与系统迭代
    result_type = Column(SQLEnum(ResultType), nullable=True, index=True)
    error_level = Column(SQLEnum(ErrorLevel), nullable=True)
    environment_mismatch_flag = Column(Boolean, nullable=True, default=False)
    permanent_exclusion_flag = Column(Boolean, nullable=True, default=False)
    correct_action = Column(Text, nullable=False)
    llm_action_item = Column(Text, nullable=True)
```

### 2. Enum Definitions

所有枚举类型定义：

```python
class LLMAnalysisStatus(enum.Enum):
    PENDING = "Pending"
    PROCESSING = "Processing"
    COMPLETED = "Completed"
    FAILED = "Failed"

class AccountType(enum.Enum):
    SHORT_TERM = "短线账户"
    MEDIUM_TERM = "中线账户"

class TradeCycle(enum.Enum):
    SHORT_TERM = "短线"
    MEDIUM_TERM = "中线"
    LONG_TERM = "长线"

class PnLFlag(enum.Enum):
    PROFIT = "盈利"
    LOSS = "亏损"
    BREAKEVEN = "保本出局"

class MarketEnvironment(enum.Enum):
    BULL_MAIN_RISE = "牛市-主升"
    BULL_CORRECTION = "牛市-调整"
    BEAR_MAIN_FALL = "熊市-主跌"
    BEAR_REBOUND = "熊市-反弹"
    RANGE_UPPER = "震荡市-上轨"
    RANGE_LOWER = "震荡市-下轨"
    RANGE_MIDDLE = "震荡市-中枢"

class SectorStatus(enum.Enum):
    STARTUP = "启动期"
    MAIN_RISE = "主升期"
    CLIMAX = "高潮期"
    RETREAT = "退潮期"
    CHAOS = "混沌期"

class PlanAdherence(enum.Enum):
    FULL_COMPLIANCE = "完全按计划"
    SLIGHT_DEVIATION = "轻微偏离"
    IMPULSIVE = "临盘起意冲动交易"

class StopLossDiscipline(enum.Enum):
    PRESET_AND_EXECUTED = "有预设并严格执行"
    PRESET_NOT_EXECUTED = "有预设但未执行"
    NO_PRESET = "无预设止损"

class ExitType(enum.Enum):
    ACTIVE_PROFIT = "主动止盈"
    PASSIVE_STOP = "被动止损"
    BREAKEVEN_EXIT = "保本出局"
    EMOTIONAL_EXIT = "模式外情绪化离场"

class PsychologicalState(enum.Enum):
    CALM = "冷静"
    FOMO = "追涨FOMO"
    GREED = "贪婪"
    FEAR = "恐惧"

class ResultType(enum.Enum):
    CORRECT_PROFIT = "正确盈利"
    LUCKY_PROFIT = "运气盈利"
    EXECUTION_LOSS = "执行亏损"
    PATTERN_LOSS = "模式亏损"

class ErrorLevel(enum.Enum):
    EXECUTION_ERROR = "执行层错误"
    PATTERN_ERROR = "模式层错误"
    ENVIRONMENT_ERROR = "环境层错误"
```

### 3. Soft Delete Query Mixin

软删除查询过滤器：

```python
from sqlalchemy.orm import Query

class SoftDeleteMixin:
    """Mixin to add soft delete functionality"""
    
    @classmethod
    def active_query(cls, session):
        """Return query filtering out soft-deleted records"""
        return session.query(cls).filter(cls.deleted_at.is_(None))
    
    def soft_delete(self):
        """Mark record as deleted"""
        self.deleted_at = func.now()
    
    def restore(self):
        """Restore soft-deleted record"""
        self.deleted_at = None

# Apply to Trade model
class Trade(Base, SoftDeleteMixin):
    # ... (fields as defined above)
    pass
```

### 4. Optimistic Locking Handler

乐观锁实现：

```python
from sqlalchemy.orm.exc import StaleDataError
from sqlalchemy import event

@event.listens_for(Trade, 'before_update')
def increment_version(mapper, connection, target):
    """Automatically increment version on update"""
    target.version += 1

def update_with_optimistic_lock(session, trade_id, updates, expected_version):
    """
    Update trade record with optimistic locking
    
    Args:
        session: SQLAlchemy session
        trade_id: UUID of trade to update
        updates: dict of field updates
        expected_version: expected current version
    
    Returns:
        Updated Trade object
    
    Raises:
        StaleDataError: if version mismatch detected
    """
    trade = session.query(Trade).filter(
        Trade.id == trade_id,
        Trade.version == expected_version
    ).first()
    
    if not trade:
        raise StaleDataError("Version mismatch or record not found")
    
    for key, value in updates.items():
        setattr(trade, key, value)
    
    session.commit()
    return trade
```

### 5. Validation Layer

数据验证逻辑：

```python
from sqlalchemy.orm import validates
from datetime import datetime

class Trade(Base, SoftDeleteMixin):
    # ... (fields as defined above)
    
    @validates('entry_price', 'exit_price', 'position_size')
    def validate_positive_numbers(self, key, value):
        """Ensure prices and position size are positive"""
        if value is not None and value <= 0:
            raise ValueError(f"{key} must be positive")
        return value
    
    @validates('exit_date')
    def validate_exit_after_entry(self, key, exit_date):
        """Ensure exit date is after entry date"""
        if exit_date and self.entry_date and exit_date < self.entry_date:
            raise ValueError("exit_date must be after entry_date")
        return exit_date
    
    @validates('correct_action')
    def validate_correct_action_not_empty(self, key, value):
        """Ensure correct_action is not empty"""
        if not value or not value.strip():
            raise ValueError("correct_action cannot be empty")
        return value
    
    @validates('pnl_amount')
    def auto_set_pnl_flag(self, key, pnl_amount):
        """Automatically set pnl_flag based on pnl_amount"""
        if pnl_amount is not None:
            if pnl_amount > 0.01:
                self.pnl_flag = PnLFlag.PROFIT
            elif pnl_amount < -0.01:
                self.pnl_flag = PnLFlag.LOSS
            else:
                self.pnl_flag = PnLFlag.BREAKEVEN
        return pnl_amount
```

### 6. Index Definitions

数据库索引配置：

```python
from sqlalchemy import Index

# Composite index for user's active trades
Index('idx_trades_user_deleted', Trade.user_id, Trade.deleted_at)

# Single column indexes (defined in Column definitions above):
# - stock_code
# - entry_date
# - market_environment
# - result_type
# - user_id
```

## Data Models

### Trade Record Schema

完整的 trades 表结构：

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| **模块 0: 系统、安全与日志审计** |
| id | UUID | PRIMARY KEY | uuid_v4() | 主键 |
| user_id | VARCHAR(255) | NOT NULL, INDEX | - | 用户标识 |
| created_at | TIMESTAMP | NOT NULL | now() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | now() | 更新时间 |
| deleted_at | TIMESTAMP | NULL | NULL | 删除时间（软删除） |
| version | INTEGER | NOT NULL | 1 | 乐观锁版本号 |
| llm_analysis_status | ENUM | NOT NULL | 'Pending' | LLM 分析状态 |
| llm_raw_log | JSONB | NULL | NULL | LLM 原始日志 |
| **模块 1: 基础交易事实与风控** |
| account_type | ENUM | NOT NULL | - | 账户类型 |
| stock_code | VARCHAR(20) | NOT NULL, INDEX | - | 股票代码 |
| stock_name | VARCHAR(100) | NULL | NULL | 股票名称 |
| trade_cycle | ENUM | NOT NULL | - | 交易周期 |
| entry_date | TIMESTAMP | NOT NULL, INDEX | - | 开仓日期 |
| exit_date | TIMESTAMP | NULL | NULL | 平仓日期 |
| position_size | FLOAT | NOT NULL | - | 仓位大小 |
| entry_price | FLOAT | NOT NULL | - | 开仓价格 |
| exit_price | FLOAT | NULL | NULL | 平仓价格 |
| preset_stop_loss | FLOAT | NULL | NULL | 预设止损价 |
| preset_take_profit | FLOAT | NULL | NULL | 预设止盈价 |
| slippage | FLOAT | NULL | 0.0 | 滑点 |
| max_favorable_excursion | FLOAT | NULL | NULL | 最大有利偏移 |
| max_adverse_excursion | FLOAT | NULL | NULL | 最大不利偏移 |
| pnl_amount | FLOAT | NULL | NULL | 盈亏金额 |
| pnl_ratio | FLOAT | NULL | NULL | 盈亏比例 |
| pnl_flag | ENUM | NULL | NULL | 盈亏标志 |
| **模块 2: 决策环境快照** |
| market_environment | ENUM | NULL, INDEX | NULL | 市场环境 |
| sector_status | ENUM | NULL | NULL | 板块状态 |
| selection_dimension | ARRAY(VARCHAR) | NULL | NULL | 选股维度 |
| strategy_pattern | ARRAY(VARCHAR) | NULL | NULL | 策略模式 |
| volume_profile | VARCHAR(500) | NULL | NULL | 量能特征 |
| thesis_statement | TEXT | NULL | NULL | 买入论点 |
| **模块 3: 执行与心理评估** |
| plan_adherence | ENUM | NULL | NULL | 计划执行度 |
| stop_loss_discipline | ENUM | NULL | NULL | 止损纪律 |
| exit_type | ENUM | NULL | NULL | 离场类型 |
| exit_reason | TEXT | NULL | NULL | 离场原因 |
| psychological_state | ENUM | NULL | NULL | 心理状态 |
| **模块 4: 深度归因与系统迭代** |
| result_type | ENUM | NULL, INDEX | NULL | 结果类型 |
| error_level | ENUM | NULL | NULL | 错误层级 |
| environment_mismatch_flag | BOOLEAN | NULL | FALSE | 环境不匹配标志 |
| permanent_exclusion_flag | BOOLEAN | NULL | FALSE | 永久排除标志 |
| correct_action | TEXT | NOT NULL | - | 改进行动（必填） |
| llm_action_item | TEXT | NULL | NULL | LLM 行动建议 |

### Array Field Values

**selection_dimension** 可选值：
- 技术面
- 政策面
- 基本面
- 事件驱动
- 情绪接力

**strategy_pattern** 可选值：
- 突破买入
- 回踩低吸
- 龙头首阴
- （可扩展其他策略）

## Correctness Properties

*属性（Property）是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### Property 1: UUID Uniqueness
*For any* set of created trade records, all generated UUIDs should be unique.
**Validates: Requirements 1.2**

### Property 2: Created Timestamp Auto-Set
*For any* newly created trade record, the created_at field should be automatically set to a timestamp within 1 second of the current time.
**Validates: Requirements 2.1**

### Property 3: Updated Timestamp Auto-Update
*For any* trade record update operation, the updated_at field should be set to a timestamp newer than the previous updated_at value.
**Validates: Requirements 2.2, 18.3**

### Property 4: Timestamp UTC Timezone
*For any* trade record, all timestamp fields (created_at, updated_at, deleted_at, entry_date, exit_date) should be stored in UTC timezone.
**Validates: Requirements 2.3**

### Property 5: Created Timestamp Immutability
*For any* trade record, performing an update operation should not change the created_at field value.
**Validates: Requirements 2.4**

### Property 6: Soft Delete Preservation
*For any* trade record, performing a soft delete should set deleted_at to a non-null timestamp and preserve all other field values unchanged.
**Validates: Requirements 2.5, 3.1, 3.4**

### Property 7: Default Query Excludes Deleted
*For any* default query operation (without explicit deleted filter), the results should not include any records where deleted_at is not null.
**Validates: Requirements 3.2, 18.5**

### Property 8: Initial Version Number
*For any* newly created trade record, the version field should be set to 1.
**Validates: Requirements 4.1**

### Property 9: Version Increment on Update
*For any* trade record update operation, the new version number should equal the old version number plus 1.
**Validates: Requirements 4.2**

### Property 10: Optimistic Lock Conflict Detection
*For any* update attempt with a version number that doesn't match the current record version, the system should reject the update and raise a conflict error.
**Validates: Requirements 4.3**

### Property 11: Version in Read Response
*For any* read operation on a trade record, the response should include the current version number.
**Validates: Requirements 4.4**

### Property 12: Initial LLM Status
*For any* newly created trade record, the llm_analysis_status should be set to "Pending".
**Validates: Requirements 5.2**

### Property 13: LLM Log JSONB Validity
*For any* trade record with llm_raw_log set, the stored value should be valid JSONB that can be queried using PostgreSQL JSONB operators.
**Validates: Requirements 5.6, 16.2**

### Property 14: Date Range Validation
*For any* trade record where both entry_date and exit_date are set, exit_date should be greater than or equal to entry_date.
**Validates: Requirements 6.5**

### Property 15: Positive Value Validation
*For any* trade record, the fields position_size, entry_price, and exit_price (when set) should all be positive numbers greater than zero.
**Validates: Requirements 6.7, 15.2, 15.3, 15.4**

### Property 16: PnL Flag Auto-Classification
*For any* trade record with pnl_amount set:
- If pnl_amount > 0.01, then pnl_flag should be "盈利"
- If pnl_amount < -0.01, then pnl_flag should be "亏损"
- If -0.01 <= pnl_amount <= 0.01, then pnl_flag should be "保本出局"
**Validates: Requirements 8.4, 8.5, 8.6**

### Property 17: Array Field Multi-Value Support
*For any* trade record, the selection_dimension and strategy_pattern fields should support storing and retrieving multiple values simultaneously.
**Validates: Requirements 10.3, 17.1, 17.2**

### Property 18: Array Field Query Matching
*For any* query filtering by a specific value in selection_dimension or strategy_pattern, the results should include all records where that array field contains the queried value.
**Validates: Requirements 17.3**

### Property 19: Correct Action Non-Empty
*For any* trade record, the correct_action field should be non-null and contain at least one non-whitespace character.
**Validates: Requirements 13.1, 23.1**

### Property 20: Stock Code Non-Empty
*For any* trade record, the stock_code field should be non-null and non-empty.
**Validates: Requirements 23.2**

### Property 21: PnL Amount Calculation
*For any* trade record with exit_price set, the pnl_amount should equal (exit_price - entry_price) * position_size - slippage (where slippage defaults to 0 if null).
**Validates: Requirements 21.1**

### Property 22: PnL Ratio Calculation
*For any* trade record with exit_price set, the pnl_ratio should equal pnl_amount / (entry_price * position_size) * 100.
**Validates: Requirements 21.2**

### Property 23: Stop Loss Below Entry (Long Position)
*For any* trade record with preset_stop_loss set (assuming long positions), the preset_stop_loss should be less than entry_price.
**Validates: Requirements 21.3**

### Property 24: Take Profit Above Entry (Long Position)
*For any* trade record with preset_take_profit set (assuming long positions), the preset_take_profit should be greater than entry_price.
**Validates: Requirements 21.4**

### Property 25: Version Always Positive
*For any* trade record at any point in its lifecycle, the version field should be a positive integer (>= 1).
**Validates: Requirements 21.5**

### Property 26: Bulk Validation Independence
*For any* bulk insert operation containing multiple records, each record should be validated independently, and validation failure of one record should not affect validation of others.
**Validates: Requirements 25.2**

### Property 27: JSON Serialization DateTime Format
*For any* trade record serialized to JSON, all datetime fields should be converted to ISO 8601 format strings.
**Validates: Requirements 27.2**

### Property 28: JSON Serialization Enum Format
*For any* trade record serialized to JSON, all enum fields should be converted to their string representations.
**Validates: Requirements 27.3**

### Property 29: Serialization Round-Trip
*For any* valid trade record, serializing to JSON and then deserializing back should produce a record equivalent to the original.
**Validates: Requirements 27.5**

## Error Handling

### Validation Errors

**Invalid Data Errors**:
- Negative or zero values for prices and position_size → `ValueError` with descriptive message
- exit_date before entry_date → `ValueError: "exit_date must be after entry_date"`
- Empty correct_action → `ValueError: "correct_action cannot be empty"`
- Invalid enum values → `ValueError` with list of valid values

**Concurrency Errors**:
- Version mismatch during update → `StaleDataError` with current version information
- Concurrent modification detected → Retry logic or user notification

**JSON Validation Errors**:
- Invalid JSON in llm_raw_log → `ValueError: "llm_raw_log must be valid JSON"`
- Malformed JSONB data → PostgreSQL error propagated to application

### Database Errors

**Connection Errors**:
- Database unavailable → Retry with exponential backoff
- Connection timeout → Log error and return 503 Service Unavailable

**Constraint Violations**:
- Primary key conflict → `IntegrityError` (should not occur with UUID v4)
- Foreign key violation → `IntegrityError` with referenced table information
- Not-null constraint → `IntegrityError` with field name

**Query Errors**:
- Invalid query syntax → `ProgrammingError` with SQL details
- Index not found → Fallback to full table scan with performance warning

### Error Response Format

All errors should return structured information:

```python
{
    "error_type": "ValidationError",
    "message": "Human-readable error description",
    "field": "field_name",  # if applicable
    "details": {
        "expected": "Expected value or format",
        "received": "Actual value received"
    }
}
```

## Testing Strategy

### Dual Testing Approach

本系统采用单元测试和属性测试相结合的策略：

**单元测试（Unit Tests）**:
- 验证特定示例和边界情况
- 测试错误条件和异常处理
- 测试数据库迁移脚本
- 测试 ORM 模型的特定方法
- 快速执行，提供即时反馈

**属性测试（Property-Based Tests）**:
- 验证跨所有输入的通用属性
- 使用随机生成的测试数据
- 每个属性至少运行 100 次迭代
- 发现边界情况和意外行为
- 提供更全面的覆盖

两种测试方法互补：单元测试捕获具体错误，属性测试验证通用正确性。

### Property-Based Testing Configuration

**测试库选择**: 使用 `hypothesis` 库进行 Python 属性测试

**配置要求**:
- 每个属性测试最少 100 次迭代
- 使用 `@given` 装饰器定义输入生成策略
- 每个测试必须引用设计文档中的属性编号

**标签格式**:
```python
# Feature: database-schema, Property 1: UUID Uniqueness
@given(st.lists(st.builds(Trade, ...)))
def test_uuid_uniqueness(trades):
    ...
```

### Test Data Generators

使用 Hypothesis 策略生成测试数据：

```python
from hypothesis import strategies as st
from hypothesis.extra.pytz import timezones

# 基础策略
uuid_strategy = st.uuids()
positive_float = st.floats(min_value=0.01, max_value=1000000)
stock_code_strategy = st.text(min_size=4, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Nd')))
timestamp_strategy = st.datetimes(timezones=timezones())

# 枚举策略
account_type_strategy = st.sampled_from(AccountType)
trade_cycle_strategy = st.sampled_from(TradeCycle)
pnl_flag_strategy = st.sampled_from(PnLFlag)

# 复合策略
trade_strategy = st.builds(
    Trade,
    id=uuid_strategy,
    user_id=st.uuids().map(str),
    stock_code=stock_code_strategy,
    entry_price=positive_float,
    position_size=positive_float,
    account_type=account_type_strategy,
    trade_cycle=trade_cycle_strategy,
    correct_action=st.text(min_size=1)
)
```

### Unit Test Coverage

**核心功能测试**:
- Trade 模型创建和字段赋值
- 软删除和恢复操作
- 乐观锁更新流程
- LLM 状态转换
- 枚举值验证

**边界情况测试**:
- 空字符串和 null 值处理
- 极大和极小的数值
- 时区边界情况
- 数组字段的空数组

**集成测试**:
- 数据库连接和会话管理
- 事务提交和回滚
- 索引使用验证
- 批量操作性能

### Migration Testing

**迁移脚本测试**:
- 初始表创建验证
- 字段添加/删除的数据保留
- 索引创建验证
- 回滚操作验证

**数据迁移测试**:
- 旧数据格式转换
- 默认值填充
- 数据完整性检查

### Performance Testing

虽然不在单元测试范围内，但应定期进行性能测试：

- 100,000 条记录的查询性能
- 索引效果验证
- 批量插入性能
- JSONB 查询性能

### Test Organization

```
tests/
├── unit/
│   ├── test_trade_model.py          # Trade 模型单元测试
│   ├── test_enums.py                 # 枚举定义测试
│   ├── test_validators.py            # 验证器测试
│   └── test_soft_delete.py           # 软删除功能测试
├── property/
│   ├── test_uuid_properties.py       # UUID 相关属性测试
│   ├── test_timestamp_properties.py  # 时间戳属性测试
│   ├── test_version_properties.py    # 版本控制属性测试
│   ├── test_validation_properties.py # 数据验证属性测试
│   ├── test_calculation_properties.py # 计算属性测试
│   └── test_serialization_properties.py # 序列化属性测试
├── integration/
│   ├── test_database_operations.py   # 数据库操作集成测试
│   ├── test_bulk_operations.py       # 批量操作测试
│   └── test_query_performance.py     # 查询性能测试
└── migrations/
    └── test_alembic_migrations.py    # 迁移脚本测试
```

### Continuous Integration

**CI 流程**:
1. 运行所有单元测试（快速反馈）
2. 运行属性测试（100+ 迭代）
3. 运行集成测试（需要数据库）
4. 生成覆盖率报告（目标 > 90%）
5. 运行迁移测试（独立数据库）

**测试环境**:
- 使用 Docker 容器运行 PostgreSQL
- 每次测试运行使用独立数据库
- 测试后自动清理

## Implementation Notes

### Database Setup

```sql
-- 创建数据库
CREATE DATABASE trading_review_system;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'UTC';
```

### Alembic Configuration

```python
# alembic.ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://user:password@localhost/trading_review_system

# env.py
from sqlalchemy import engine_from_config, pool
from alembic import context
from models import Base

target_metadata = Base.metadata

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        
        with context.begin_transaction():
            context.run_migrations()
```

### Session Management

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

engine = create_engine(
    'postgresql://user:password@localhost/trading_review_system',
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True  # 验证连接有效性
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Session = scoped_session(SessionLocal)

# 使用上下文管理器
def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()
```

### Query Examples

```python
# 查询用户的活跃交易
active_trades = Trade.active_query(session).filter(
    Trade.user_id == user_id
).all()

# 按股票代码查询
trades_by_stock = session.query(Trade).filter(
    Trade.stock_code == 'AAPL',
    Trade.deleted_at.is_(None)
).all()

# 按市场环境过滤
bull_market_trades = session.query(Trade).filter(
    Trade.market_environment.in_([
        MarketEnvironment.BULL_MAIN_RISE,
        MarketEnvironment.BULL_CORRECTION
    ]),
    Trade.deleted_at.is_(None)
).all()

# 按日期范围查询
from datetime import datetime, timedelta
start_date = datetime.now() - timedelta(days=30)
recent_trades = session.query(Trade).filter(
    Trade.entry_date >= start_date,
    Trade.deleted_at.is_(None)
).order_by(Trade.entry_date.desc()).all()

# 查询包含特定选股维度的交易
tech_trades = session.query(Trade).filter(
    Trade.selection_dimension.contains(['技术面']),
    Trade.deleted_at.is_(None)
).all()

# 乐观锁更新
try:
    trade = update_with_optimistic_lock(
        session,
        trade_id='...',
        updates={'exit_price': 150.0, 'pnl_amount': 500.0},
        expected_version=3
    )
except StaleDataError:
    # 处理并发冲突
    print("Record was modified by another transaction")
```

### Future Extensibility

**预留扩展点**:
1. **JSONB 字段**: llm_raw_log 可存储任意 LLM 响应结构
2. **数组字段**: selection_dimension 和 strategy_pattern 可添加新值而不修改表结构
3. **枚举扩展**: 可通过迁移添加新的枚举值
4. **索引优化**: 可根据实际查询模式添加新索引
5. **分区策略**: 未来可按 entry_date 进行表分区以提升大数据量性能

**不建议的修改**:
- 修改主键类型（UUID v4 已足够）
- 删除 version 字段（破坏并发控制）
- 删除 deleted_at 字段（破坏审计追踪）
- 修改 created_at 为可更新（违反审计原则）
