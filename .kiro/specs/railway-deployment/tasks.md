# Implementation Plan: Railway Deployment

## Overview

配置 Railway 部署所需的全部文件和设置，确保 Monorepo 中的两个服务能独立构建和部署。

## Tasks

- [ ] 1. Backend 部署配置
  - [x] 1.1 创建 `backend/requirements.txt`
  - [x] 1.2 创建 `backend/Procfile` (alembic migrate + uvicorn)
  - [x] 1.3 创建 `backend/railway.toml` (healthcheck, restart policy)
  - [ ] 1.4 测试 Railway 构建 (Nixpacks Python 检测)

- [ ] 2. Frontend 部署配置
  - [x] 2.1 确保 `frontend/package.json` 包含 build 和 start scripts
  - [x] 2.2 创建 `frontend/railway.toml`
  - [ ] 2.3 测试 Railway 构建 (Nixpacks Node.js 检测)

- [ ] 3. Railway Project 配置（在 Dashboard 中）
  - [ ] 3.1 连接 GitHub 仓库 (ganksolo/Review-System)
  - [ ] 3.2 添加 PostgreSQL Plugin
  - [ ] 3.3 创建 Backend Service, 设置 Root Directory = backend/
  - [ ] 3.4 创建 Frontend Service, 设置 Root Directory = frontend/
  - [ ] 3.5 配置 Backend 环境变量
  - [ ] 3.6 配置 Frontend 环境变量 (NEXT_PUBLIC_API_URL)
  - [ ] 3.7 配置自动部署触发 (main 分支)

- [ ] 4. 自定义域名（可选）
  - [ ] 4.1 在 Railway 添加自定义域名
  - [ ] 4.2 配置 DNS CNAME 记录
  - [ ] 4.3 验证 SSL 证书自动配置

- [ ] 5. 部署验证
  - [ ] 5.1 验证 Backend /health 返回 200
  - [ ] 5.2 验证 Frontend 页面正常加载
  - [ ] 5.3 验证 API 文档可访问 /docs
  - [ ] 5.4 验证数据库连接正常
