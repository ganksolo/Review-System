# Database Schema 文档

交易复盘系统的数据库架构文档，基于 Python + SQLAlchemy 2.0 (async) + PostgreSQL + Alembic。

## 技术栈

- **ORM**: SQLAlchemy 2.0 (async mode)
- **Database**: PostgreSQL 14+
- **Migration**: Alembic
- **Driver**: asyncpg
- **Testing**: pytest + hypothesis (property-based)

## 核心模型: Trade

`trades` 表包含 5 个逻辑模块，覆盖交易从开仓到复盘的完整信息。

### 模块 0: 系统、安全与日志审计

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| id | UUID | 主键，自动生成 UUID v4 |
| user_id | String(255) | 用户标识，带索引 |
| created_at | TIMESTAMP(tz) | 创建时间，自动设置 |
| updated_at | TIMESTAMP(tz) | 更新时间，自动更新 |
| deleted_at | TIMESTAMP(tz) | 软删除标记 |
| version | Integer | 乐观锁版本号 |
| llm_analysis_status | Enum | LLM 分析状态 |
| llm_raw_log | JSONB | LLM 原始返回日志 |

### 模块 1: 基础交易事实与风控

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| account_type | Enum | 短线账户 / 中线账户 |
| stock_code | String(20) | 股票代码，带索引 |
| stock_name | String(100) | 股票名称 |
| trade_cycle | Enum | 交易周期 |
| entry_date | TIMESTAMP(tz) | 买入时间，带索引 |
| exit_date | TIMESTAMP(tz) | 卖出时间 |
| position_size | Float | 持仓仓位占比 (%) |
| entry_price | Float | 实际买入均价 |
| exit_price | Float | 实际卖出均价 |
| preset_stop_loss | Float | 预设止损价 |
| preset_take_profit | Float | 预设止盈价 |
| slippage | Float | 滑点/交易损耗 |
| max_favorable_excursion | Float | 最大浮盈 (MFE) |
| max_adverse_excursion | Float | 最大浮亏 (MAE) |
| pnl_amount | Float | 实际盈亏金额（自动计算） |
| pnl_ratio | Float | 实际盈亏比例（自动计算） |
| pnl_flag | Enum | 盈亏标识（自动设置） |

### 模块 2: 决策环境快照

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| market_environment | Enum | 市场环境，带索引 |
| sector_status | Enum | 板块阶段 |
| selection_dimension | ARRAY(String) | 选股维度（多选） |
| strategy_pattern | ARRAY(String) | 买入模式标签（多选） |
| volume_profile | String(500) | 量能特征 |
| thesis_statement | Text | 买入论点 |

### 模块 3: 执行与心理评估

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| plan_adherence | Enum | 计划执行度 |
| stop_loss_discipline | Enum | 止损纪律 |
| exit_type | Enum | 离场类型 |
| exit_reason | Text | 具体卖出理由 |
| psychological_state | Enum | 交易时心理状态 |

### 模块 4: 深度归因与系统迭代

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| result_type | Enum | 结果类型，带索引 |
| error_level | Enum | 错误层级 |
| environment_mismatch_flag | Boolean | 环境错配标记 |
| permanent_exclusion_flag | Boolean | 永久排除标记 |
| correct_action | Text | 对应正确行为（必填） |
| llm_action_item | Text | LLM 生成的行动指令 |

## 枚举类型

所有枚举定义在 `app/models/enums.py`，继承 `(str, enum.Enum)`，支持字符串比较。

| 枚举 | 值 |
| ---- | ---- |
| LLMAnalysisStatus | Pending, Processing, Completed, Failed |
| AccountType | 短线账户, 中线账户 |
| TradeCycle | 短线, 中线, 长线 |
| PnLFlag | 盈利, 亏损, 保本出局 |
| MarketEnvironment | 牛市-主升, 牛市-调整, 熊市-主跌, 熊市-反弹, 震荡市-上轨/下轨/中枢 |
| SectorStatus | 启动期, 主升期, 高潮期, 退潮期, 混沌期 |
| PlanAdherence | 完全按计划, 轻微偏离, 临盘起意冲动交易 |
| StopLossDiscipline | 有预设并严格执行, 有预设但未执行, 无预设止损 |
| ExitType | 主动止盈, 被动止损, 保本出局, 模式外情绪化离场 |
| PsychologicalState | 冷静, 追涨FOMO, 贪婪, 恐惧 |
| ResultType | 正确盈利, 运气盈利, 执行亏损, 模式亏损 |
| ErrorLevel | 执行层错误, 模式层错误, 环境层错误 |

## 特性

### 软删除

通过 `deleted_at` 字段实现。调用 `trade.soft_delete()` 标记删除，`trade.restore()` 恢复。所有默认查询自动排除已删除记录。

### 乐观锁

通过 `version` 字段实现。每次更新前检查版本号，不匹配则抛出 `OptimisticLockError`。版本号在 `before_update` 事件中自动递增。

### PnL 自动计算

```
pnl_amount = (exit_price - entry_price) * position_size - slippage
pnl_ratio  = pnl_amount / (entry_price * position_size) * 100
pnl_flag   = 根据 pnl_amount 自动设置 (盈利/亏损/保本出局)
```

### 索引

- `user_id` — 用户级别数据隔离
- `stock_code` — 按股票代码查询
- `entry_date` — 按时间范围查询
- `market_environment` — 按市场环境过滤
- `result_type` — 按结果类型过滤
- `(user_id, deleted_at)` — 复合索引，优化软删除查询

## 数据库迁移

```bash
cd backend

# 生成新迁移
alembic revision --autogenerate -m "describe changes"

# 执行迁移
alembic upgrade head

# 回滚一步
alembic downgrade -1
```

## 测试

```bash
cd backend

# 运行所有测试
pytest

# 运行数据库相关测试
pytest tests/test_database.py tests/test_integration.py -v

# 运行性能基准测试
pytest tests/test_benchmark.py -v

# 生成覆盖率报告
pytest --cov=app --cov-report=term-missing
```

## 目录结构

```
backend/
├── app/
│   ├── models/
│   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   ├── enums.py         # 所有枚举定义
│   │   └── trade.py         # Trade ORM 模型
│   ├── schemas/
│   │   └── trade.py         # Pydantic 验证 schemas
│   ├── services/
│   │   └── trade_service.py # 业务逻辑层
│   ├── db/
│   │   └── session.py       # 数据库会话管理
│   └── core/
│       └── errors.py        # 自定义异常
├── alembic/
│   └── versions/            # 迁移脚本
├── tests/
│   ├── conftest.py          # 测试配置和 fixtures
│   ├── test_database.py     # 属性测试 (hypothesis)
│   ├── test_schemas.py      # Schema 验证测试
│   ├── test_trade_service.py # Service 层测试
│   ├── test_integration.py  # 集成测试
│   └── test_benchmark.py    # 性能基准测试
└── requirements.txt
```
