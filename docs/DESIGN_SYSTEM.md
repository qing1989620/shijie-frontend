# 设计系统 · Design Tokens

设计关键词：**克制、安静、专业、知识感、高信息密度但不拥挤、长期使用不疲劳。**

明令禁止：紫蓝渐变、赛博霓虹、玻璃拟态满屏、机器人头像、星星闪光、AI Powered 字样、无意义动画。

## 色彩（src/styles/tokens.css @theme）

| 令牌 | 值 | 用途 |
|---|---|---|
| paper / paper-warm | #FAFAF8 / #F5F4F0 | 页面背景（暖白） |
| ink-950 → ink-50 | #16181C → #F4F5F7 | 文字与分隔（深墨灰阶） |
| brand-700/600/500 | #0E4F47 / #14655A / #1D7D6F | 唯一品牌色（低饱和深青）——主按钮、链接、强调 |
| amber-accent / amber-soft | #B45309 / #FDF1E2 | 复习/优先级/薄弱提醒（功能性强调，克制使用） |
| red-ink / green-ink | #B03A3A / #2E7D4F | 错误 / 成功反馈 |
| brand-100 / brand-50 | #DCEBE8 / #EEF5F3 | 选中态、浅底色块 |

状态不靠颜色单打独斗：一律附文字（如「薄弱 · 掌握 32%（估算）」）。

## 字体

- 正文/界面：system 栈（PingFang SC / 微软雅黑 / Segoe UI）
- 标题与数字点缀：`font-serif`（Noto Serif SC 回退 Georgia）——「知识感」的来源
- 基准 15px，正文行高 relaxed

## 圆角 / 阴影 / 动效

- 卡片圆角 10px（--radius-card），阴影极轻（0 1px 6px / 4%）
- 动效仅限 hover 过渡与录音指示灯 pulse；`prefers-reduced-motion` 全局关闭动画

## 图标

全部为单色线性 SVG（stroke 1.6），内联在 `Sidebar.tsx` 的 `icon()` 工厂中；**不使用 emoji**。

## 布局

- 桌面：Sidebar(224px) + Topbar(56px) + Workspace(max-w-6xl)
- 移动（<768px）：Sidebar 隐藏，Topbar 内横向一级导航
- 已验证视口：1440 / 1280 / 1024 / 768 / 390

## 可访问性

- 全局 `:focus-visible` 品牌色描边；Modal 带 `role=dialog/aria-modal`
- 表单 Label 显式关联；错误 `role=alert`
- 掌握度等 AI 估算值一律标注「估算」，不宣称精确
