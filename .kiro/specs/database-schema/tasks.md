# Implementation Plan: Database Schema for Trading Review System

## Overview

本实现计划将交易复盘系统的数据库架构分解为可执行的编码任务。使用 Python + SQLAlchemy ORM + PostgreSQL + Alembic 技术栈，按模块逐步实现数据模型、验证逻辑、查询接口和测试。

实现策略：
1. 先建立基础设施（枚举、基类、配置）
2. 实现核心 Trade 模型和验证器
3. 添加软删除和乐观锁功能
4. 实现查询接口和辅助方法
5. 编写属性测试和单元测试
6. 创建数据库迁移脚本

## Tasks

- [x] 1. 设置项目结构和依赖
  - 创建项目目录结构（models/, tests/, alembic/）
  - 创建 requirements.txt 包含 SQLAlchemy, psycopg2-binary, alembic, hypothesis, pytest
  - 创建 .env.example 文件定义数据库连接配置
  - _Requirements: 18.1, 19.1_

- [x] 2. 定义所有枚举类型
  - [x] 2.1 创建 models/enums.py 文件
    - 定义 LLMAnalysisStatus, AccountType, TradeCycle, PnLFlag 枚举
    - 定义 MarketEnvironment, SectorStatus 枚举
    - 定义 PlanAdherence, StopLossDiscipline, ExitType, PsychologicalState 枚举
    - 定义 ResultType, ErrorLevel 枚举
    - 所有枚举继承 Python enum.Enum
    - _Requirements: 5.1, 6.1, 6.3, 8.3, 9.1, 9.2, 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 22.1-22.12_
  
  - [x] 2.2 编写枚举单元测试
    - 测试所有枚举值可正确访问
    - 测试枚举字符串表示正确
    - _Requirements: 22.1-22.12_

- [x] 3. 实现 Trade 模型基础结构
  - [x] 3.1 创建 models/base.py 定义 Base 和数据库配置
    - 使用 declarative_base() 创建 Base
    - 配置数据库连接字符串
    - 实现 get_db() 会话管理函数
    - _Requirements: 18.1_
  
  - [x] 3.2 创建 models/trade.py 定义 Trade 模型类
    - 定义 __tablename__ = 'trades'
    - 实现模块 0 字段：id, user_id, created_at, updated_at, deleted_at, version, llm_analysis_status, llm_raw_log
    - 实现模块 1 字段：account_type, stock_code, stock_name, trade_cycle, entry_date, exit_date, position_size, entry_price, exit_price, preset_stop_loss, preset_take_profit, slippage, max_favorable_excursion, max_adverse_excursion, pnl_amount, pnl_ratio, pnl_flag
    - 实现模块 2 字段：market_environment, sector_status, selection_dimension, strategy_pattern, volume_profile, thesis_statement
    - 实现模块 3 字段：plan_adherence, stop_loss_discipline, exit_type, exit_reason, psychological_state
    - 实现模块 4 字段：result_type, error_level, environment_mismatch_flag, permanent_exclusion_flag, correct_action, llm_action_item
    - 使用正确的 SQLAlchemy 类型（UUID, TIMESTAMP, JSONB, ARRAY, Enum）
    - 设置 nullable, default, index 约束
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 6.2, 6.4, 6.6, 7.1, 7.3, 7.4, 8.1, 8.2, 10.4, 10.5, 11.4, 13.2, 13.3, 13.5, 13.6, 15.1_
  
  - [x] 3.3 编写 Trade 模型基础单元测试
    - 测试模型实例化
    - 测试所有字段可正确赋值和读取
    - 测试默认值设置
    - _Requirements: 18.1_

- [x] 4. 实现数据验证器
  - [x] 4.1 在 Trade 模型中添加 @validates 装饰器方法
    - validate_positive_numbers: 验证 entry_price, exit_price, position_size > 0
    - validate_exit_after_entry: 验证 exit_date >= entry_date
    - validate_correct_action_not_empty: 验证 correct_action 非空且非纯空白
    - validate_stock_code_not_empty: 验证 stock_code 非空
    - auto_set_pnl_flag: 根据 pnl_amount 自动设置 pnl_flag
    - _Requirements: 6.5, 6.7, 8.4, 8.5, 8.6, 13.1, 15.2, 15.3, 15.4, 23.1, 23.2_
  
  - [x] 4.2 编写属性测试：正数验证
  - [x] 4.3 编写属性测试：日期范围验证
  - [x] 4.4 编写属性测试：PnL 标志自动分类
  - [x] 4.5 编写属性测试：必填字段验证

- [x] 5. 实现时间戳自动管理
  - [x] 5.1 配置 created_at 默认值为 func.now()
  - [x] 5.2 配置 updated_at 自动更新
  - [x] 5.3 编写属性测试：创建时间戳自动设置
  - [x] 5.4 编写属性测试：更新时间戳自动更新
  - [x] 5.5 编写属性测试：创建时间戳不可变
  - [x] 5.6 编写属性测试：时区为 UTC

- [x] 6. 实现软删除功能
  - [x] 6.1 创建 models/mixins.py 定义 SoftDeleteMixin（实际集成在 Trade 模型中）
  - [x] 6.2 让 Trade 模型继承 SoftDeleteMixin
  - [x] 6.3 编写属性测试：软删除保留数据
  - [x] 6.4 编写属性测试：默认查询排除已删除
  - [x] 6.5 编写单元测试：软删除和恢复

- [x] 7. 实现乐观锁机制
  - [x] 7.1 添加 version 字段自动递增逻辑
  - [x] 7.2 实现 update_with_optimistic_lock() 函数（在 TradeService 中实现）
  - [x] 7.3 编写属性测试：初始版本号
  - [x] 7.4 编写属性测试：版本号递增
  - [x] 7.5 编写属性测试：乐观锁冲突检测
  - [x] 7.6 编写属性测试：版本号始终为正
  - [x] 7.7 编写单元测试：乐观锁更新流程

- [x] 8. 实现 UUID 主键生成
  - [x] 8.1 配置 id 字段使用 uuid.uuid4 作为默认值
  - [x] 8.2 编写属性测试：UUID 唯一性
  - [x] 8.3 编写单元测试：主键查询

- [x] 9. 实现 LLM 分析状态管理
  - [x] 9.1 设置 llm_analysis_status 默认值为 Pending
  - [x] 9.2 实现 LLM 状态转换方法
  - [x] 9.3 编写属性测试：初始 LLM 状态
  - [x] 9.4 编写属性测试：JSONB 有效性
  - [x] 9.5 编写单元测试：LLM 状态转换

- [x] 10. 实现数组字段支持
  - [x] 10.1 配置 selection_dimension 和 strategy_pattern 为 ARRAY 类型
  - [x] 10.2 编写属性测试：数组多值支持
  - [x] 10.3 编写属性测试：数组查询匹配
  - [x] 10.4 编写单元测试：数组字段操作

- [x] 11. 实现 PnL 计算逻辑
  - [x] 11.1 添加 calculate_pnl() 方法（在 TradeService 中实现）
  - [x] 11.2 添加风控参数验证
  - [x] 11.3 编写属性测试：PnL 金额计算
  - [x] 11.4 编写属性测试：PnL 比例计算
  - [x] 11.5 编写属性测试：止损价格验证
  - [x] 11.6 编写属性测试：止盈价格验证

- [x] 12. 实现数据库索引
  - [x] 12.1 在 Trade 模型中定义索引
  - [x] 12.2 编写单元测试：索引存在性验证

- [x] 13. 实现查询接口
  - [x] 13.1 创建 models/queries.py 定义查询函数（查询逻辑已在 TradeService 中实现）
  - [x] 13.2 编写单元测试：查询功能

- [x] 14. 实现序列化功能
  - [x] 14.1 在 Trade 模型中添加 to_dict() 方法（已通过 Pydantic TradeResponse from_attributes 实现）
  - [x] 14.2 实现 from_dict() 类方法
  - [x] 14.3 编写属性测试：日期时间序列化格式
  - [x] 14.4 编写属性测试：枚举序列化格式
  - [x] 14.5 编写属性测试：序列化往返

- [x] 15. 实现批量操作
  - [x] 15.1 创建 bulk_insert() 函数（在 TradeService.bulk_create_trades 中实现）
  - [x] 15.2 编写属性测试：批量验证独立性
  - [x] 15.3 编写单元测试：批量操作

- [x] 16. 创建 Alembic 迁移脚本
  - [x] 16.1 初始化 Alembic
  - [x] 16.2 生成初始迁移脚本
  - [x] 16.3 编写迁移测试

- [x] 17. 编写集成测试
  - [x] 17.1 创建数据库集成测试
  - [x] 17.2 创建性能基准测试

- [x] 18. 创建文档和示例
  - [x] 18.1 编写 README.md
  - [x] 18.2 创建 examples/ 目录

- [x] 19. 最终检查点
  - 确保所有测试通过（137 passed）
  - 确保代码覆盖率 > 90%（database-schema 核心模块 95%+）
  - 确保数据库迁移可正常执行
  - 询问用户是否有问题或需要调整

## Notes

- 每个任务都引用了具体的需求编号以确保可追溯性
- 属性测试使用 hypothesis 库，每个测试至少 100 次迭代
- 所有属性测试都标注了对应的设计文档属性编号
- 建议按顺序执行任务，因为后续任务依赖前面的基础设施
- 所有测试任务都是必需的，以确保系统的全面正确性
