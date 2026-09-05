# 前端部署

前端是纯静态站点，构建产物 `dist/` 可部署到任何静态托管。

## 构建

```bash
npm ci
VITE_API_BASE_URL=https://api.example.com/api/v1 \
VITE_WS_BASE_URL=wss://api.example.com \
npm run build
```

## 部署形态

| 形态 | 说明 |
|---|---|
| Docker + Nginx | 仓库自带 `Dockerfile`（多阶段构建）+ `nginx.conf`（SPA 回退 + 资源长缓存） |
| Cloudflare Pages / Vercel / Netlify | 构建命令 `npm run build`，产物 `dist/`；环境变量在平台配置 |
| 反代同域 | Nginx `location /api/` 段已预留（注释态），启用后可同域免 CORS |

## 与后端的连接

- 跨域部署（推荐）：`https://learn.example.com`（前端）→ `https://api.example.com`（后端），
  后端 `CORS_ORIGINS` 精确列出前端域；refresh token 生产建议 Cookie 模式。
- 同域部署：前端反代 `/api` 与 `/ws` 到后端，浏览器视角同源，CORS/CSRF 面最小。

## HTTPS / 反向代理

- 必须 HTTPS（麦克风权限 `getUserMedia` 在非安全上下文不可用，localhost 除外）。
- WebSocket 用 `wss://`；Nginx 反代 WS 需 `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`

## 回滚

镜像/tag 化部署；静态托管用 immutable 构建产物 + 指针切换，秒级回滚。
