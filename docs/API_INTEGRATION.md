# API 集成与契约同步

## 唯一事实源

后端仓库的 `backend/contracts/openapi.json` 是 API 唯一机器契约；
本仓库持有同步快照 `src/api/schema/openapi.json`（生成时去掉 `/api/v1` 前缀，
因为客户端 `VITE_API_BASE_URL` 已包含前缀）。

## 更新 / 生成

```bash
npm run api:generate            # 从后端契约（工作区相对路径）刷新快照并生成类型
OPENAPI_SOURCE_URL=http://localhost:8000/openapi.json npm run api:generate
npm run api:update              # 等价：指向本机运行中的后端
```

产物：`src/api/generated/schema.d.ts`（**不要手改**）。

## 使用（openapi-fetch，路径/参数/响应全量类型化）

```ts
import { api } from "../api/client";

const { data, error } = await api.GET("/lessons/{lesson_id}", {
  params: { path: { lesson_id: id } },
});
if (error) { /* error 是契约中的错误模型 */ }
```

规则：
- **禁止手写后端 DTO**；新字段必须走 后端 → 契约 → regenerate 流程。
- 查询参数放在 `params: { query: {...} }`（嵌套结构）。
- 错误展示用 `errMsg(error)`（`src/stores/auth.ts`）规范化——同时兼容
  Problem Details（`{code,detail}`）与 FastAPI 校验数组；业务分支一律判断
  `code` 字段，**禁止**用中文文案字符串判断。

## 环境变量（仅公开浏览器配置）

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_ENV=development
```

严禁把 `OPENROUTER_API_KEY / JWT_SECRET / DATABASE_URL / STORAGE_SECRET`
等放进任何 `VITE_*`（会进入浏览器 bundle）。

## 跨域认证（前后端不同域部署）

- 开发：access(30min) + rotating refresh(14d) 存 localStorage，客户端 401 自动刷新重放。
- 生产：应切换为 **HttpOnly + Secure + SameSite=None（或反代同站）Cookie** 承载 refresh，
  避免长期 token 落 JS 可读存储；`CORS_ORIGINS` 必须精确列出前端域，
  禁止 `*` + credentials 组合。WS 握手用一次性 short-lived ticket（POST /realtime/tickets）。

## 契约漂移

后端 CI 会对比 live OpenAPI 与冻结契约；前端 CI 用仓库快照生成类型并跑
`typecheck + test + build`。任何 breaking change 需要后端先走
`docs/api/API_CHANGELOG.md` 流程。
