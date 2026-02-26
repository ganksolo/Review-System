---
description: 基于 .kiro specs 进行功能开发的标准流程
---

# Spec 驱动开发流程

本项目使用 `.kiro/specs/` 目录管理所有模块的需求、设计和任务计划。每次开发新功能或修改现有功能时，请严格遵循以下流程。

## 项目结构一览

```
.kiro/specs/
├── database-schema/       # 数据库模型 (SQLAlchemy + PostgreSQL)
├── backend-api/           # 后端 API (FastAPI)
├── frontend-ui/           # 前端 UI (Next.js)
├── llm-analysis/          # LLM 分析引擎
├── railway-deployment/    # Railway 部署
└── authentication/        # 认证与鉴权
```

每个 spec 目录包含:
- `requirements.md` — 需求文档（User Stories + Acceptance Criteria）
- `design.md` — 技术设计方案（架构、接口、模型）
- `tasks.md` — 实现任务清单（可执行的 checklist）

## 开发流程

### 1. 阅读相关 Spec（必须）

在写任何代码之前，先阅读相关模块的 spec 文件:

// turbo
```
查看 .kiro/specs/<模块名>/requirements.md 了解需求
查看 .kiro/specs/<模块名>/design.md 了解技术方案
查看 .kiro/specs/<模块名>/tasks.md 了解任务清单和进度
```

### 2. 确认任务范围

在 `tasks.md` 中找到当前要做的任务:
- `[ ]` = 未开始
- `[/]` = 进行中
- `[x]` = 已完成

将要开始的任务标记为 `[/]`。

### 3. 检查跨模块依赖

各模块之间有依赖关系，开发时注意:
- **database-schema** 是基础，所有枚举和模型定义以此为准
- **backend-api** 依赖 database-schema 的 ORM 模型和枚举（不要重复定义）
- **frontend-ui** 的 Zod 枚举值必须与 backend 的 Python 枚举值一致（中文）
- **llm-analysis** 依赖 backend-api 的 Trade 模型
- **authentication** 影响所有 API 端点的用户识别方式

### 4. 编码实现

按照 `design.md` 中的技术方案编写代码:
- 后端代码放在 `backend/app/` 目录
- 前端代码放在 `frontend/` 目录
- 遵循 design.md 中定义的分层架构

### 5. 更新任务进度

完成后将 `tasks.md` 中的任务标记为 `[x]`。

### 6. Git 分支策略

- **`main`**: 生产分支，合并到 main 自动触发 Railway 部署
- **`dev`**: 开发分支，日常开发在此进行
- **`feature/*`**: 功能分支，从 dev 创建，完成后合并回 dev

```bash
# 创建功能分支
git checkout dev
git checkout -b feature/xxx

# 开发完成后合并
git checkout dev
git merge feature/xxx
git push origin dev

# 准备发布时合并到 main
git checkout main
git merge dev
git push origin main  # 触发 Railway 自动部署
```

## 关键约定

1. **枚举值统一**: 所有枚举以 `database-schema/design.md` 为唯一数据源
2. **API 响应格式**: 统一使用 `{success, data, message, error}` 结构
3. **环境变量**: 参见根目录 `.env.example`，敏感信息只在 Railway Dashboard 配置
4. **异步优先**: 后端所有接口使用 `async/await`
5. **中文优先**: UI 文本和枚举值使用中文
