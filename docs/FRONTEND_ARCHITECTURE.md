# 拾阶前端 · 架构说明

独立 React 工程，通过 REST（openapi-fetch）+ WebSocket 与后端通信，不依赖父目录任何文件。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 构建 | Vite 5 + React 18 + TypeScript 5（strict） | `noImplicitAny` 全开，业务代码零 `any` |
| 路由 | react-router-dom 6 | `src/routes/index.tsx` 集中声明 |
| 数据 | TanStack Query 5 | 所有服务端状态；mutation 失败有错误提示 |
| API Client | openapi-typescript 生成类型 + openapi-fetch | **禁止手写 DTO**（见 API_INTEGRATION.md） |
| 样式 | Tailwind CSS 4 + CSS tokens | 设计令牌在 `src/styles/tokens.css` |
| 数学 | KaTeX | 存储/传输均为 LaTeX 源文本，仅渲染时转换 |

## 目录

```
src/
├── app/            # AppLayout（认证门卫 + Shell）
├── routes/         # 路由表
├── features/       # 业务域（auth/dashboard/lessons/questions/practice/review/analytics/settings）
├── components/
│   ├── ui/         # 设计系统组件（kit.tsx：Button/Card/Input/Badge/EmptyState/Modal…）
│   └── shared/     # Sidebar / Topbar
├── api/
│   ├── generated/  # openapi-typescript 产物（勿手改）
│   ├── schema/     # 后端契约快照（去 /api/v1 前缀）
│   └── client.ts   # typed fetch 客户端 + 401 自动刷新重放
├── stores/         # token 存储 + 错误规范化（errMsg）
├── lib/            # 工具（KaTeX 渲染、时间格式化）
└── styles/         # tokens.css 设计令牌
e2e/                # Playwright 完整闭环 E2E（发布门禁）
```

## 认证流程

- 登录/注册后保存 access + refresh（开发模式 localStorage；生产建议 HttpOnly Cookie，见 API_INTEGRATION.md 跨域认证节）。
- 全局 fetch wrapper：请求自动带 Bearer；401 时用 refresh token 轮换刷新并重放一次；刷新失败清除会话跳转登录。

## 状态与轮询策略

- 长任务（课堂笔记/题目分析）通过 `POST ...-jobs` 创建后轮询 `GET /jobs/{id}`（800ms）；后端也提供 SSE `GET /jobs/{id}/events` 可平滑升级。
- 列表页使用 Query 缓存 + 失效刷新；组题后固定顺序来自 `practice_set_items.position`。
