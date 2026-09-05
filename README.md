# 拾阶 · 前端（Shijie Frontend）

智能学习闭环平台前端：**课堂 → 练习 → 巩固**。

独立工程：可单独 clone / 单独部署（静态站点），只通过 REST + WebSocket 访问后端。

## 快速开始

```bash
cd frontend
npm install
cp .env.example .env        # 默认指向 http://localhost:8000
npm run dev                 # http://localhost:5173
```

需要后端运行（见 backend/README.md）。演示账号：`demo@shijie.app / demo12345`。

## 常用命令

```bash
npm run dev            # 开发服务器
npm run build          # tsc 严格检查 + 生产构建
npm run typecheck      # 仅类型检查（strict + noImplicitAny）
npm test               # vitest 单元测试
npm run api:generate   # 从后端契约生成类型化 API Client
npm run api:update     # 从运行中的后端(8000)拉取最新契约
```

## E2E（发布门禁）

```bash
# 需要前后端同时在本地运行
npx playwright test
```

`e2e/full-loop.spec.ts` 驱动真实浏览器跑完整学习闭环
（注册 → 课堂录音转写 → 笔记 → 找题收藏 → 分析 → 专项 → 组题作答 → 复习安排），
截图输出到 `e2e/screenshots/`。

## 文档

- [FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md)
- [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- [API_INTEGRATION.md](docs/API_INTEGRATION.md)
- [UI_UX_RESEARCH.md](docs/UI_UX_RESEARCH.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
