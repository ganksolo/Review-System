# Design Document: Data Migration (CSV Import/Export)

## Overview

完善 CSV 导出覆盖全部 27 个表单字段，新增后端 CSV 导入 API 和前端上传入口，实现跨环境数据迁移。

## CSV 字段映射

| 序号 | CSV 表头 | Trade 字段 | 类型 |
| ---- | -------- | ---------- | ---- |
| 1 | 账户类型 | account_type | enum |
| 2 | 股票代码 | stock_code | string |
| 3 | 股票名称 | stock_name | string? |
| 4 | 交易周期 | trade_cycle | enum |
| 5 | 买入时间 | entry_date | datetime |
| 6 | 卖出时间 | exit_date | datetime? |
| 7 | 仓位% | position_size | float |
| 8 | 买入价 | entry_price | float |
| 9 | 卖出价 | exit_price | float? |
| 10 | 预设止损 | preset_stop_loss | float? |
| 11 | 预设止盈 | preset_take_profit | float? |
| 12 | 滑点 | slippage | float? |
| 13 | 最大浮盈 | max_favorable_excursion | float? |
| 14 | 最大浮亏 | max_adverse_excursion | float? |
| 15 | 市场环境 | market_environment | enum? |
| 16 | 板块地位 | sector_status | enum? |
| 17 | 选股维度 | selection_dimension | array? (分号分隔) |
| 18 | 策略模式 | strategy_pattern | array? (分号分隔) |
| 19 | 量能特征 | volume_profile | string? |
| 20 | 交易论点 | thesis_statement | text? |
| 21 | 计划执行度 | plan_adherence | enum? |
| 22 | 止损纪律 | stop_loss_discipline | enum? |
| 23 | 离场类型 | exit_type | enum? |
| 24 | 离场原因 | exit_reason | text? |
| 25 | 心理状态 | psychological_state | enum? |
| 26 | 结果归因 | result_type | enum? |
| 27 | 错误层级 | error_level | enum? |
| 28 | 环境错配 | environment_mismatch_flag | bool? |
| 29 | 永久排除 | permanent_exclusion_flag | bool? |
| 30 | 正确行为 | correct_action | string |

## 后端 API

### POST /api/trades/import

- 接受 `multipart/form-data` 文件上传
- 使用 Python `csv` 模块解析
- 逐行映射 CSV 表头 → TradeCreate schema
- 返回 `{success_count, failure_count, failures: [{row, error}]}`

## 前端

### 导出：修改 `exportCSV()` 函数，包含全部 30 列
### 导入：交易列表页新增「导入 CSV」按钮，弹出文件选择器

## Error Handling

- CSV 编码异常: 尝试 UTF-8，回退 GBK
- 空文件: 返回 400
- 必填字段缺失: 跳过该行，记录到 failures
