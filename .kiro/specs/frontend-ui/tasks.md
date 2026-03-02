# Implementation Plan: Frontend UI

## Overview

基于 Next.js 14+ App Router 实现交易复盘前端，包含交易录入、列表、详情、规则库和可视化仪表板。

## Tasks

- [x] 1. 项目配置与基础组件
  - [x] 1.1 安装 shadcn/ui 并初始化
  - [x] 1.2 安装 TanStack Query, React Hook Form, Zod, Recharts
  - [x] 1.3 创建 API Client (`lib/api.ts`)
  - [x] 1.4 创建 TypeScript 类型定义 (`types/trade.ts`)
  - [x] 1.5 创建 Zod 验证 schemas (`lib/validations/trade.ts`)
  - [x] 1.6 配置 TanStack Query Provider

- [x] 2. 布局与导航
  - [x] 2.1 创建 Root Layout (导航栏、侧边栏)
  - [x] 2.2 创建 Navbar 组件
  - [x] 2.3 创建 Sidebar 组件

- [x] 3. 交易录入表单 (CSR)
  - [x] 3.1 创建分步表单容器 TradeForm
  - [x] 3.2 Step 1: 基础信息 (账户类型、代码、价格、仓位)
  - [x] 3.3 Step 2: 决策环境 (市场、板块、选股维度、论点)
  - [x] 3.4 Step 3: 执行评估 (计划执行度、止损纪律、心理状态)
  - [x] 3.5 Step 4: 归因反思 (结果类型、错误层级、正确行为)
  - [x] 3.6 实现草稿 localStorage 自动保存/恢复
  - [x] 3.7 实现表单提交 (TanStack Mutation)

- [x] 4. 交易列表页 (SSR + Hydration)
  - [x] 4.1 创建 TradeTable 组件
  - [x] 4.2 创建 TradeFilters 过滤面板
  - [x] 4.3 实现分页组件
  - [x] 4.4 实现排序功能
  - [x] 4.5 实现 CSV/Excel 导出

- [x] 5. 交易详情页 (SSR)
  - [x] 5.1 创建 TradeDetail 组件
  - [x] 5.2 展示 LLM 分析结果 (llm_raw_log)
  - [x] 5.3 编辑和删除按钮

- [x] 6. 动态规则库 (SSR)
  - [x] 6.1 创建永久排除清单 ExclusionList
  - [x] 6.2 创建正确行为清单 CorrectBehaviors
  - [x] 6.3 创建环境错配提醒 MismatchAlerts
  - [x] 6.4 规则库汇总统计面板

- [x] 7. 数据可视化仪表板 (CSR)
  - [x] 7.1 盈亏曲线 (PnL Curve)
  - [x] 7.2 胜率统计 (Win Rate Chart)
  - [x] 7.3 错误分布图 (Error Distribution)

- [x] 8. 响应式设计
  - [x] 8.1 桌面端布局
  - [x] 8.2 平板/手机端自适应

- [ ] 9. 测试
  - [ ] 9.1 组件单元测试 (Vitest + React Testing Library)
  - [ ] 9.2 E2E 测试 (Playwright — 表单提交流程)
