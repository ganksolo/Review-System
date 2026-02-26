# 交易复盘系统 — Trading Review System

> 基于 "输入-计算-反馈" 范式的智能交易复盘平台。通过 LLM 驱动的归因分析，帮助交易者区分技能与运气、识别系统性错误、持续优化交易系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Python 3.11+ · FastAPI · SQLAlchemy 2.0 (async) · Alembic |
| **前端** | Next.js 14+ · TypeScript · Tailwind CSS · shadcn/ui |
| **数据库** | PostgreSQL 14+ |
| **LLM** | OpenAI / DeepSeek API |
| **部署** | Railway (自动 CI/CD) |

## 项目结构

```
Review-System/
├── backend/                  # FastAPI 后端服务
│   ├── app/
│   │   ├── main.py           # 应用入口
│   │   ├── core/config.py    # 环境变量配置
│   │   ├── db/session.py     # 数据库会话管理
│   │   ├── models/           # SQLAlchemy ORM 模型
│   │   ├── api/routes/       # API 端点
│   │   └── middleware/       # 中间件
│   ├── alembic/              # 数据库迁移
│   ├── requirements.txt
│   ├── Procfile              # Railway 启动命令
│   └── railway.toml          # Railway 部署配置
├── frontend/                 # Next.js 前端应用
│   ├── src/app/              # App Router 页面
│   ├── package.json
│   └── railway.toml          # Railway 部署配置
├── .env.example              # 环境变量参考
├── .gitignore
└── README.md
```

## 本地开发

### 前置条件

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 复制环境变量并修改
cp .env.example .env

# 执行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install

# 创建 .env.local 并设置 API 地址
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 启动开发服务器
npm run dev
```

访问:
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## Railway 部署

本项目采用 **Monorepo** 结构，在 Railway 上需要为 backend 和 frontend 分别创建服务。

### 部署步骤

1. **创建 Railway 项目** 并连接 GitHub 仓库 (`ganksolo/Review-System`)
2. **添加 PostgreSQL Plugin** — 自动生成 `DATABASE_URL`
3. **创建 Backend 服务**
   - Root Directory: `backend/`
   - 环境变量: `DATABASE_URL`, `ALLOWED_ORIGINS`, `LLM_API_KEY`, `LLM_MODEL`, `PORT`, `LOG_LEVEL`
4. **创建 Frontend 服务**
   - Root Directory: `frontend/`
   - 环境变量: `NEXT_PUBLIC_API_URL` (设为 Backend 的公网 URL), `PORT`
5. **部署触发**: 推送或合并代码到 `main` 分支时自动部署

### 环境变量

参见 [.env.example](.env.example) 了解所有需要配置的环境变量。

> ⚠️ **注意**: 敏感信息（`LLM_API_KEY` 等）只在 Railway Dashboard 中配置，不要提交到代码仓库。

## 分支策略

- **`main`**: 生产分支，合并到 main 自动触发 Railway 部署
- **`dev`**: 开发分支，日常开发在此进行
- **`feature/*`**: 功能分支，完成后合并到 dev

## License

Private — All rights reserved.
