# Implementation Plan: Backend API

## Overview

基于 database-schema 中已定义的 Trade ORM 模型，实现 FastAPI RESTful API 层。包括 CRUD 端点、规则库查询、Pydantic 校验、Service 业务层和测试。

## Tasks

- [ ] 1. 创建 Pydantic Schemas
  - [ ] 1.1 创建 `app/schemas/common.py` — StandardResponse, PaginatedResponse, PaginationInfo
  - [ ] 1.2 创建 `app/schemas/trade.py` — TradeCreate, TradeUpdate, TradeResponse, TradeFilters
    - 所有枚举引用 `app/models/enums.py`
    - TradeCreate 包含 model_validator: exit_date >= entry_date
    - TradeUpdate 附带 version 字段（乐观锁）
  - _Requirements: 1.2, 1.3, 1.5, 1.6, 4.3, 7.1-7.4_

- [ ] 2. 创建自定义异常类
  - [ ] 2.1 创建 `app/core/errors.py` — TradeNotFoundError, OptimisticLockError, BusinessValidationError
  - [ ] 2.2 在 `main.py` 注册异常处理器 (404, 409, 422, 400, 500)
  - _Requirements: 8.1-8.6_

- [ ] 3. 实现 Trade Service 层
  - [ ] 3.1 创建 `app/services/trade_service.py`
  - [ ] 3.2 实现 create_trade(): 创建 + PnL 计算 + pnl_flag 自动设置
  - [ ] 3.3 实现 get_trades(): 多条件过滤 + 分页 + 排序 + 软删除排除
  - [ ] 3.4 实现 get_trade_by_id(): 单条查询 + 软删除排除
  - [ ] 3.5 实现 update_trade(): 乐观锁 + PnL 重算 + version 递增
  - [ ] 3.6 实现 soft_delete_trade() + restore_trade()
  - [ ] 3.7 实现 bulk_create_trades(): 独立验证 + 事务回滚
  - [ ] 3.8 实现 calculate_pnl(): pnl_amount + pnl_ratio + pnl_flag
  - _Requirements: 1.1-1.8, 2.1-2.12, 3.1-3.4, 4.1-4.8, 5.1-5.6, 6.1-6.5_

- [ ] 4. 实现规则库 Service 方法
  - [ ] 4.1 实现 get_permanent_exclusions(): permanent_exclusion_flag=true
  - [ ] 4.2 实现 get_correct_behaviors(): result_type=正确盈利
  - [ ] 4.3 实现 get_environment_mismatches(): environment_mismatch_flag=true
  - _Requirements: 16.1-16.4 (new)_

- [ ] 5. 实现 API 路由
  - [ ] 5.1 创建 `app/api/routes/trades.py` — 7 个端点
  - [ ] 5.2 创建 `app/api/routes/rules.py` — 4 个端点
  - [ ] 5.3 在 `main.py` 注册路由 (prefix=/api)
  - _Requirements: 1-6, 16_

- [ ] 6. 编写测试
  - [ ] 6.1 单元测试: Pydantic schemas 验证
  - [ ] 6.2 单元测试: Service 层逻辑
  - [ ] 6.3 集成测试: CRUD API 端点
  - [ ] 6.4 集成测试: 规则库 API
  - [ ] 6.5 属性测试: PnL 计算正确性
  - [ ] 6.6 属性测试: 查询过滤 AND 逻辑
  - [ ] 6.7 属性测试: 分页限制
