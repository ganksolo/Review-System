# 交易复盘系统 — 前端

Next.js 14+ 前端应用，使用 App Router、TypeScript、Tailwind CSS 和 shadcn/ui。

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 环境变量

在 `frontend/` 目录下创建 `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 测试

### 单元测试 (Vitest + React Testing Library)

```bash
# 运行所有单元测试
npm test

# 监听模式
npm run test:watch
```

测试文件位于 `tests/` 目录，覆盖:

- `utils.test.ts` — 工具函数 (`cn`, `formatDate`, `formatPnL` 等)
- `validations.test.ts` — Zod schema 验证
- `api.test.ts` — API 客户端
- `sidebar.test.tsx` — Sidebar 组件
- `query-provider.test.tsx` — QueryProvider 组件
- `trade-types.test.ts` — TypeScript 枚举常量

### E2E 测试 (Playwright)

```bash
# 首次运行需要安装浏览器
npx playwright install

# 运行 E2E 测试
npm run test:e2e
```

E2E 测试文件位于 `e2e/` 目录，覆盖:

- `navigation.spec.ts` — 页面导航
- `trade-form.spec.ts` — 交易录入表单流程

> E2E 测试会自动启动 Next.js 开发服务器（端口 3000）。

## 目录结构

```
frontend/
├── app/                    # App Router 页面
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页 (Dashboard)
│   ├── trades/             # 交易列表和录入
│   ├── rules/              # 规则库
│   └── analytics/          # 数据分析
├── components/             # React 组件
│   ├── layout/Sidebar.tsx  # 侧边栏导航
│   └── QueryProvider.tsx   # TanStack Query Provider
├── lib/                    # 工具和 hooks
│   ├── api.ts              # API 客户端
│   ├── utils.ts            # 工具函数
│   ├── hooks/              # 自定义 hooks
│   └── validations/        # Zod schemas
├── types/                  # TypeScript 类型定义
├── tests/                  # 单元测试
├── e2e/                    # E2E 测试
├── vitest.config.ts        # Vitest 配置
└── playwright.config.ts    # Playwright 配置
```
