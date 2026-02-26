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

- [ ] 1. 设置项目结构和依赖
  - 创建项目目录结构（models/, tests/, alembic/）
  - 创建 requirements.txt 包含 SQLAlchemy, psycopg2-binary, alembic, hypothesis, pytest
  - 创建 .env.example 文件定义数据库连接配置
  - _Requirements: 18.1, 19.1_

- [ ] 2. 定义所有枚举类型
  - [ ] 2.1 创建 models/enums.py 文件
    - 定义 LLMAnalysisStatus, AccountType, TradeCycle, PnLFlag 枚举
    - 定义 MarketEnvironment, SectorStatus 枚举
    - 定义 PlanAdherence, StopLossDiscipline, ExitType, PsychologicalState 枚举
    - 定义 ResultType, ErrorLevel 枚举
    - 所有枚举继承 Python enum.Enum
    - _Requirements: 5.1, 6.1, 6.3, 8.3, 9.1, 9.2, 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 22.1-22.12_
  
  - [ ] 2.2 编写枚举单元测试
    - 测试所有枚举值可正确访问
    - 测试枚举字符串表示正确
    - _Requirements: 22.1-22.12_

- [ ] 3. 实现 Trade 模型基础结构
  - [ ] 3.1 创建 models/base.py 定义 Base 和数据库配置
    - 使用 declarative_base() 创建 Base
    - 配置数据库连接字符串
    - 实现 get_db() 会话管理函数
    - _Requirements: 18.1_
  
  - [ ] 3.2 创建 models/trade.py 定义 Trade 模型类
    - 定义 __tablename__ = 'trades'
    - 实现模块 0 字段：id, user_id, created_at, updated_at, deleted_at, version, llm_analysis_status, llm_raw_log
    - 实现模块 1 字段：account_type, stock_code, stock_name, trade_cycle, entry_date, exit_date, position_size, entry_price, exit_price, preset_stop_loss, preset_take_profit, slippage, max_favorable_excursion, max_adverse_excursion, pnl_amount, pnl_ratio, pnl_flag
    - 实现模块 2 字段：market_environment, sector_status, selection_dimension, strategy_pattern, volume_profile, thesis_statement
    - 实现模块 3 字段：plan_adherence, stop_loss_discipline, exit_type, exit_reason, psychological_state
    - 实现模块 4 字段：result_type, error_level, environment_mismatch_flag, permanent_exclusion_flag, correct_action, llm_action_item
    - 使用正确的 SQLAlchemy 类型（UUID, TIMESTAMP, JSONB, ARRAY, Enum）
    - 设置 nullable, default, index 约束
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 6.2, 6.4, 6.6, 7.1, 7.3, 7.4, 8.1, 8.2, 10.4, 10.5, 11.4, 13.2, 13.3, 13.5, 13.6, 15.1_
  
  - [ ] 3.3 编写 Trade 模型基础单元测试
    - 测试模型实例化
    - 测试所有字段可正确赋值和读取
    - 测试默认值设置
    - _Requirements: 18.1_

- [ ] 4. 实现数据验证器
  - [ ] 4.1 在 Trade 模型中添加 @validates 装饰器方法
    - validate_positive_numbers: 验证 entry_price, exit_price, position_size > 0
    - validate_exit_after_entry: 验证 exit_date >= entry_date
    - validate_correct_action_not_empty: 验证 correct_action 非空且非纯空白
    - validate_stock_code_not_empty: 验证 stock_code 非空
    - auto_set_pnl_flag: 根据 pnl_amount 自动设置 pnl_flag
    - _Requirements: 6.5, 6.7, 8.4, 8.5, 8.6, 13.1, 15.2, 15.3, 15.4, 23.1, 23.2_
  
  - [ ] 4.2 编写属性测试：正数验证
    - **Property 15: Positive Value Validation**
    - **Validates: Requirements 6.7, 15.2, 15.3, 15.4**
  
  - [ ] 4.3 编写属性测试：日期范围验证
    - **Property 14: Date Range Validation**
    - **Validates: Requirements 6.5**
  
  - [ ] 4.4 编写属性测试：PnL 标志自动分类
    - **Property 16: PnL Flag Auto-Classification**
    - **Validates: Requirements 8.4, 8.5, 8.6**
  
  - [ ] 4.5 编写属性测试：必填字段验证
    - **Property 19: Correct Action Non-Empty**
    - **Property 20: Stock Code Non-Empty**
    - **Validates: Requirements 13.1, 23.1, 23.2**

- [ ] 5. 实现时间戳自动管理
  - [ ] 5.1 配置 created_at 默认值为 func.now()
    - 使用 server_default=func.now()
    - _Requirements: 2.1_
  
  - [ ] 5.2 配置 updated_at 自动更新
    - 使用 server_default=func.now() 和 onupdate=func.now()
    - _Requirements: 2.2, 18.3_
  
  - [ ] 5.3 编写属性测试：创建时间戳自动设置
    - **Property 2: Created Timestamp Auto-Set**
    - **Validates: Requirements 2.1**
  
  - [ ] 5.4 编写属性测试：更新时间戳自动更新
    - **Property 3: Updated Timestamp Auto-Update**
    - **Validates: Requirements 2.2, 18.3**
  
  - [ ] 5.5 编写属性测试：创建时间戳不可变
    - **Property 5: Created Timestamp Immutability**
    - **Validates: Requirements 2.4**
  
  - [ ] 5.6 编写属性测试：时区为 UTC
    - **Property 4: Timestamp UTC Timezone**
    - **Validates: Requirements 2.3**

- [ ] 6. 实现软删除功能
  - [ ] 6.1 创建 models/mixins.py 定义 SoftDeleteMixin
    - 实现 active_query() 类方法过滤 deleted_at is None
    - 实现 soft_delete() 实例方法设置 deleted_at
    - 实现 restore() 实例方法清除 deleted_at
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 6.2 让 Trade 模型继承 SoftDeleteMixin
    - 修改 Trade 类定义：class Trade(Base, SoftDeleteMixin)
    - _Requirements: 3.1, 3.2, 18.5_
  
  - [ ] 6.3 编写属性测试：软删除保留数据
    - **Property 6: Soft Delete Preservation**
    - **Validates: Requirements 2.5, 3.1, 3.4**
  
  - [ ] 6.4 编写属性测试：默认查询排除已删除
    - **Property 7: Default Query Excludes Deleted**
    - **Validates: Requirements 3.2, 18.5**
  
  - [ ] 6.5 编写单元测试：软删除和恢复
    - 测试 soft_delete() 设置 deleted_at
    - 测试 restore() 清除 deleted_at
    - 测试 active_query() 过滤逻辑
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. 实现乐观锁机制
  - [ ] 7.1 添加 version 字段自动递增逻辑
    - 使用 @event.listens_for(Trade, 'before_update') 装饰器
    - 在更新前自动递增 version
    - _Requirements: 4.1, 4.2_
  
  - [ ] 7.2 实现 update_with_optimistic_lock() 函数
    - 接受 session, trade_id, updates, expected_version 参数
    - 查询时同时匹配 id 和 version
    - 如果找不到记录则抛出 StaleDataError
    - 应用更新并提交
    - _Requirements: 4.3_
  
  - [ ] 7.3 编写属性测试：初始版本号
    - **Property 8: Initial Version Number**
    - **Validates: Requirements 4.1**
  
  - [ ] 7.4 编写属性测试：版本号递增
    - **Property 9: Version Increment on Update**
    - **Validates: Requirements 4.2**
  
  - [ ] 7.5 编写属性测试：乐观锁冲突检测
    - **Property 10: Optimistic Lock Conflict Detection**
    - **Validates: Requirements 4.3**
  
  - [ ] 7.6 编写属性测试：版本号始终为正
    - **Property 25: Version Always Positive**
    - **Validates: Requirements 21.5**
  
  - [ ] 7.7 编写单元测试：乐观锁更新流程
    - 测试成功更新场景
    - 测试版本冲突场景
    - 测试并发更新场景
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. 实现 UUID 主键生成
  - [ ] 8.1 配置 id 字段使用 uuid.uuid4 作为默认值
    - 使用 Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    - _Requirements: 1.1, 1.2_
  
  - [ ] 8.2 编写属性测试：UUID 唯一性
    - **Property 1: UUID Uniqueness**
    - **Validates: Requirements 1.2**
  
  - [ ] 8.3 编写单元测试：主键查询
    - 测试按 id 查询返回唯一记录
    - _Requirements: 1.4_

- [ ] 9. 实现 LLM 分析状态管理
  - [ ] 9.1 设置 llm_analysis_status 默认值为 Pending
    - 使用 default=LLMAnalysisStatus.PENDING
    - _Requirements: 5.2_
  
  - [ ] 9.2 实现 LLM 状态转换方法
    - start_llm_analysis(): 设置状态为 Processing
    - complete_llm_analysis(log): 设置状态为 Completed，存储 log
    - fail_llm_analysis(error): 设置状态为 Failed，存储 error
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [ ] 9.3 编写属性测试：初始 LLM 状态
    - **Property 12: Initial LLM Status**
    - **Validates: Requirements 5.2**
  
  - [ ] 9.4 编写属性测试：JSONB 有效性
    - **Property 13: LLM Log JSONB Validity**
    - **Validates: Requirements 5.6, 16.2**
  
  - [ ] 9.5 编写单元测试：LLM 状态转换
    - 测试 Pending → Processing → Completed 流程
    - 测试 Pending → Processing → Failed 流程
    - _Requirements: 5.3, 5.4, 5.5_

- [ ] 10. 实现数组字段支持
  - [ ] 10.1 配置 selection_dimension 和 strategy_pattern 为 ARRAY 类型
    - 使用 Column(ARRAY(String))
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 10.2 编写属性测试：数组多值支持
    - **Property 17: Array Field Multi-Value Support**
    - **Validates: Requirements 10.3, 17.1, 17.2**
  
  - [ ] 10.3 编写属性测试：数组查询匹配
    - **Property 18: Array Field Query Matching**
    - **Validates: Requirements 17.3**
  
  - [ ] 10.4 编写单元测试：数组字段操作
    - 测试存储多个值
    - 测试空数组
    - 测试 contains 查询
    - _Requirements: 10.3, 17.1, 17.2, 17.3, 17.4_

- [ ] 11. 实现 PnL 计算逻辑
  - [ ] 11.1 添加 calculate_pnl() 方法
    - 计算 pnl_amount = (exit_price - entry_price) * position_size - slippage
    - 计算 pnl_ratio = pnl_amount / (entry_price * position_size) * 100
    - 自动设置 pnl_flag
    - _Requirements: 21.1, 21.2_
  
  - [ ] 11.2 添加风控参数验证
    - 验证 preset_stop_loss < entry_price（多头）
    - 验证 preset_take_profit > entry_price（多头）
    - _Requirements: 21.3, 21.4_
  
  - [ ] 11.3 编写属性测试：PnL 金额计算
    - **Property 21: PnL Amount Calculation**
    - **Validates: Requirements 21.1**
  
  - [ ] 11.4 编写属性测试：PnL 比例计算
    - **Property 22: PnL Ratio Calculation**
    - **Validates: Requirements 21.2**
  
  - [ ] 11.5 编写属性测试：止损价格验证
    - **Property 23: Stop Loss Below Entry (Long Position)**
    - **Validates: Requirements 21.3**
  
  - [ ] 11.6 编写属性测试：止盈价格验证
    - **Property 24: Take Profit Above Entry (Long Position)**
    - **Validates: Requirements 21.4**

- [ ] 12. 实现数据库索引
  - [ ] 12.1 在 Trade 模型中定义索引
    - 在 stock_code 字段添加 index=True
    - 在 entry_date 字段添加 index=True
    - 在 market_environment 字段添加 index=True
    - 在 result_type 字段添加 index=True
    - 在 user_id 字段添加 index=True
    - 创建复合索引 Index('idx_trades_user_deleted', Trade.user_id, Trade.deleted_at)
    - _Requirements: 9.4, 12.4, 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 12.2 编写单元测试：索引存在性验证
    - 测试所有索引已创建
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 13. 实现查询接口
  - [ ] 13.1 创建 models/queries.py 定义查询函数
    - query_by_stock_code(session, stock_code)
    - query_by_date_range(session, start_date, end_date)
    - query_by_market_environment(session, environment)
    - query_by_result_type(session, result_type)
    - query_user_active_trades(session, user_id)
    - query_by_selection_dimension(session, dimension)
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.7_
  
  - [ ] 13.2 编写单元测试：查询功能
    - 测试各种过滤条件
    - 测试组合过滤
    - 测试结果正确性
    - _Requirements: 26.1-26.7_

- [ ] 14. 实现序列化功能
  - [ ] 14.1 在 Trade 模型中添加 to_dict() 方法
    - 将所有字段转换为字典
    - datetime 字段转换为 ISO 8601 字符串
    - enum 字段转换为字符串值
    - UUID 转换为字符串
    - _Requirements: 27.1, 27.2, 27.3_
  
  - [ ] 14.2 实现 from_dict() 类方法
    - 从字典创建 Trade 实例
    - 解析 ISO 8601 日期字符串
    - 解析枚举字符串
    - 解析 UUID 字符串
    - _Requirements: 27.4_
  
  - [ ] 14.3 编写属性测试：日期时间序列化格式
    - **Property 27: JSON Serialization DateTime Format**
    - **Validates: Requirements 27.2**
  
  - [ ] 14.4 编写属性测试：枚举序列化格式
    - **Property 28: JSON Serialization Enum Format**
    - **Validates: Requirements 27.3**
  
  - [ ] 14.5 编写属性测试：序列化往返
    - **Property 29: Serialization Round-Trip**
    - **Validates: Requirements 27.5**

- [ ] 15. 实现批量操作
  - [ ] 15.1 创建 bulk_insert() 函数
    - 接受 Trade 对象列表
    - 独立验证每条记录
    - 使用事务确保原子性
    - 返回成功和失败的记录列表
    - _Requirements: 25.1, 25.2, 25.3, 25.4_
  
  - [ ] 15.2 编写属性测试：批量验证独立性
    - **Property 26: Bulk Validation Independence**
    - **Validates: Requirements 25.2**
  
  - [ ] 15.3 编写单元测试：批量操作
    - 测试全部成功场景
    - 测试部分失败场景
    - 测试事务回滚
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [ ] 16. 创建 Alembic 迁移脚本
  - [ ] 16.1 初始化 Alembic
    - 运行 alembic init alembic
    - 配置 alembic.ini 数据库连接
    - 修改 env.py 导入 Base.metadata
    - _Requirements: 19.1_
  
  - [ ] 16.2 生成初始迁移脚本
    - 运行 alembic revision --autogenerate -m "Initial schema"
    - 检查生成的迁移脚本
    - 确保所有字段、索引、约束都包含
    - _Requirements: 19.2_
  
  - [ ] 16.3 编写迁移测试
    - 测试 upgrade 创建表和索引
    - 测试 downgrade 删除表
    - 测试迁移可重复执行
    - _Requirements: 19.2, 19.3, 19.4_

- [ ] 17. 编写集成测试
  - [ ] 17.1 创建数据库集成测试
    - 测试完整的 CRUD 操作流程
    - 测试事务提交和回滚
    - 测试并发场景
    - _Requirements: 所有需求_
  
  - [ ] 17.2 创建性能基准测试
    - 测试 100,000 条记录的查询性能
    - 测试索引效果
    - 测试批量插入性能
    - _Requirements: 20.1, 20.2_

- [ ] 18. 创建文档和示例
  - [ ] 18.1 编写 README.md
    - 项目概述
    - 安装说明
    - 使用示例
    - API 文档
    - _Requirements: 28.1, 28.2, 28.3, 28.4_
  
  - [ ] 18.2 创建 examples/ 目录
    - 创建示例脚本展示常用操作
    - 创建 Jupyter notebook 演示数据分析
    - _Requirements: 28.1, 28.2, 28.3_

- [ ] 19. 最终检查点
  - 确保所有测试通过
  - 确保代码覆盖率 > 90%
  - 确保数据库迁移可正常执行
  - 询问用户是否有问题或需要调整

## Notes

- 每个任务都引用了具体的需求编号以确保可追溯性
- 属性测试使用 hypothesis 库，每个测试至少 100 次迭代
- 所有属性测试都标注了对应的设计文档属性编号
- 建议按顺序执行任务，因为后续任务依赖前面的基础设施
- 所有测试任务都是必需的，以确保系统的全面正确性
