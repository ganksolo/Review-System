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
│   │   ├── schemas/          # Pydantic 验证 schemas
│   │   ├── services/         # 业务逻辑层
│   │   ├── llm/              # LLM 分析模块
│   │   ├── api/routes/       # API 端点
│   │   └── middleware/       # 中间件
│   ├── alembic/              # 数据库迁移
│   ├── tests/                # 后端测试
│   ├── examples/             # 示例代码
│   ├── requirements.txt
│   ├── pytest.ini            # pytest 配置
│   ├── Procfile              # Railway 启动命令
│   └── railway.toml          # Railway 部署配置
├── frontend/                 # Next.js 前端应用
│   ├── app/                  # App Router 页面
│   ├── components/           # React 组件
│   ├── lib/                  # 工具函数、hooks、API 客户端
│   ├── types/                # TypeScript 类型定义
│   ├── tests/                # 单元测试 (Vitest)
│   ├── e2e/                  # E2E 测试 (Playwright)
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
- PostgreSQL 14+（需要已启动）

### 1. 创建数据库

```bash
# 创建 PostgreSQL 数据库（如果尚未创建）
createdb trading_review_system
```

### 2. 后端

```bash
cd backend

# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate    # macOS/Linux
# .venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 复制环境变量并根据本地环境修改
cp .env.example .env
# 编辑 .env，修改 DATABASE_URL 为本地数据库连接:
# DATABASE_URL=postgresql+asyncpg://你的用户名@localhost:5432/trading_review_system

# 执行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 3. 前端

```bash
cd frontend
npm install

# 创建 .env.local 并设置 API 地址
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 启动开发服务器
npm run dev
```

### 4. 访问

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## 测试

### 后端测试

后端测试使用 pytest + hypothesis（属性测试），需要连接真实 PostgreSQL 数据库。

```bash
cd backend
source .venv/bin/activate

# 运行所有测试
python -m pytest tests/ -v

# 运行测试并查看覆盖率
python -m pytest tests/ --cov=app --cov-report=term-missing

# 只运行特定测试文件
python -m pytest tests/test_database.py -v         # 属性测试
python -m pytest tests/test_trade_service.py -v     # Service 层测试
python -m pytest tests/test_api.py -v               # API 集成测试
python -m pytest tests/test_integration.py -v       # 数据库集成测试
python -m pytest tests/test_benchmark.py -v         # 性能基准测试
python -m pytest tests/test_schemas.py -v           # Schema 验证测试
python -m pytest tests/test_llm.py -v               # LLM 模块测试
```

> **注意**: 测试默认连接 `postgresql+asyncpg://你的用户名@localhost:5432/trading_review_system`。
> 可通过环境变量 `TEST_DATABASE_URL` 覆盖。测试使用事务回滚，不会污染数据库。

### 前端单元测试

前端单元测试使用 Vitest + React Testing Library。

```bash
cd frontend
npm install

# 运行所有单元测试
npm test

# 监听模式（开发时使用）
npm run test:watch
```

### 前端 E2E 测试

E2E 测试使用 Playwright，会自动启动 Next.js 开发服务器。

```bash
cd frontend

# 首次运行需要安装 Playwright 浏览器
npx playwright install

# 运行 E2E 测试
npm run test:e2e
```

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
