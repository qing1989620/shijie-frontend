import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * RELEASE BLOCKER E2E — 完整学习闭环（真实浏览器 × 真实前端 × 真实后端）：
 * 注册 → 登录 → 建课程/课堂 → 录音转写(Mock ASR) → 课堂笔记 → 找题 → 收藏
 * → 个人题库 → 知识结构分析 → 知识点树 → 专项找题 → 随机组题 → 作答
 * → Attempt → MemoryState → ReviewTask → 巩固 → 完成复习 → 下一次复习安排
 *
 * External providers (LLM/ASR/OCR) run in Mock mode — the system itself is real.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(HERE, "screenshots");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const shot = (page: import("@playwright/test").Page, name: string) =>
  page.screenshot({ path: resolve(SHOTS, name), fullPage: false });

const unique = Date.now();
const EMAIL = `e2e-${unique}@test.dev`;
const PASSWORD = "password123";
const API = process.env.E2E_BACKEND_URL ?? "http://localhost:8000";

test("完整学习闭环", async ({ page }) => {
  test.setTimeout(240_000);

  // 1) 注册
  await page.goto("/register");
  await page.getByLabel("昵称").fill("E2E 用户");
  await page.getByLabel("邮箱").fill(EMAIL);
  await page.getByLabel("密码（至少 8 位）").fill(PASSWORD);
  await page.getByRole("button", { name: "注册" }).click();
  await page.waitForURL("**/app", { timeout: 20_000 });
  await shot(page, "01-dashboard.png");
  await expect(page.getByText("今天要复习什么")).toBeVisible();

  // 2) 创建课程 + 课堂
  await page.goto("/app/lessons");
  await page.getByRole("button", { name: "新建课堂" }).click();
  await page.getByLabel("课堂主题").fill("椭圆及其标准方程");
  await page.getByLabel("学科").fill("数学");
  await page.getByLabel("年级").fill("高一");
  await page.getByRole("button", { name: "创建", exact: true }).click();
  const lessonLink = page.getByRole("link").filter({ hasText: "椭圆及其标准方程" }).first();
  await lessonLink.waitFor({ state: "visible", timeout: 15_000 });
  await lessonLink.click();
  await page.waitForURL("**/app/lessons/*", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "课堂转写" })).toBeVisible({ timeout: 15_000 });

  // 3) 录音页 UI 可用（headless-shell 无 MediaRecorder，实际音频走"上传测试音频"路径——规格允许）
  const detailUrl = page.url();
  const lessonId = detailUrl.split("/app/lessons/")[1]?.replace("/record", "");
  await page.getByRole("link", { name: "录音转写" }).click();
  await expect(page.getByRole("heading", { name: "录音控制" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "开始录音" })).toBeVisible();
  await shot(page, "02-record-page.png");

  // 上传测试音频（等价用户上传动作）→ 最终校准转写
  const login = await page.request.post(`${API}/api/v1/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  const token = (await login.json()).access_token;
  const authz = { Authorization: `Bearer ${token}` };
  const recResp = await page.request.post(`${API}/api/v1/lessons/${lessonId}/recordings`, {
    headers: authz,
    multipart: { file: { name: "lesson-test.webm", mimeType: "audio/webm", buffer: Buffer.from("RIFFfakeaudio-e2e-payload".repeat(64)) } },
  });
  expect(recResp.status()).toBe(201);
  const rec = await recResp.json();
  const finResp = await page.request.post(`${API}/api/v1/recordings/${rec.id}/finalize`, { headers: authz });
  expect(finResp.status()).toBe(200);

  // 回到课堂详情 → 转写片段已就绪
  await page.goto(`/app/lessons/${lessonId}`);
  await expect(page.getByText(/个片段/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("同学们，今天我们来复习椭圆的标准方程").first()).toBeVisible({ timeout: 15_000 });

  // 4) 生成课堂笔记（页面顶部主按钮；strict mode 下取 first）
  await page.getByRole("button", { name: "生成课堂笔记" }).first().click();
  await page.waitForSelector("text=课堂笔记", { timeout: 5_000 });
  await expect(page.getByText("老师强调")).toBeVisible({ timeout: 120_000 });
  await shot(page, "03-lesson-summary.png");

  // 5) 找相关练习 + 收藏
  await page.getByRole("button", { name: "找相关练习" }).click();
  await page.waitForSelector("text=与本次课堂内容直接相关", { timeout: 30_000 });
  await shot(page, "04-exercise-search.png");
  await page.getByRole("button", { name: "收藏" }).first().click();

  // 6) 个人题库出现收藏题
  await page.goto("/app/questions");
  await expect(page.getByText("已收藏").first()).toBeVisible();
  await shot(page, "05-question-bank.png");

  // 7) 打开题目 → AI 剖析（API 触发等价用户操作）→ UI 断言知识点树
  const qLink = page.getByRole("link").filter({ hasText: /离心率|椭圆|焦点/ }).first();
  await qLink.waitFor({ state: "visible", timeout: 15_000 });
  const qHref = await qLink.getAttribute("href");
  const qid = qHref!.split("/app/questions/")[1];
  await qLink.click();
  await page.waitForURL("**/app/questions/*", { timeout: 15_000 });

  const anJob = await page.request.post(`${API}/api/v1/questions/${qid}/analysis-jobs`, { headers: authz });
  expect(anJob.status()).toBe(202);
  const anId = (await anJob.json()).job_id;
  for (let i = 0; i < 120; i++) {
    const j = await (await page.request.get(`${API}/api/v1/jobs/${anId}`, { headers: authz })).json();
    if (j.status === "succeeded" || j.status === "failed") { expect(j.status).toBe("succeeded"); break; }
    await page.waitForTimeout(700);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "知识结构" })).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: /椭圆标准方程|前置|核心/ }).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "06-knowledge-tree.png");

  // 8) 知识点详情 → 专项找题
  await page.getByRole("button").filter({ hasText: /椭圆标准方程|前置|核心/ }).first().click();
  await page.getByRole("button", { name: "找专项练习" }).click({ timeout: 15_000 });
  await expect(page.getByText(/基础|同级|进阶/).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "07-specialized-search.png");

  // 9) 随机组题 + 作答
  await page.goto("/app/practice");
  await page.getByRole("button", { name: /纯随机/ }).click();
  await page.getByRole("button", { name: /生成练习（/ }).click();
  await page.waitForURL("**/app/practice-sets/**", { timeout: 30_000 });

  const questionCount = await page.locator("text=/第 \\d+ \\/ \\d+ 题/").first().innerText()
    .then((t) => Number(t.match(/(\d+)\s*题/)?.[1] ?? 1));
  for (let i = 0; i < questionCount; i++) {
    // 选择第一个选项 / 填任意文本 → 提交 → 依据题型判定
    const optionButton = page.locator("ul li button").first();
    const hasOptions = await optionButton.count();
    if (hasOptions > 0) {
      await optionButton.click();
    } else {
      await page.getByPlaceholder("写下你的答案…").fill("我的作答");
      await page.getByRole("button", { name: "提交答案" }).click();
    }
    await page.getByRole("button", { name: /判定并下一题|我做对了|我做错了/ }).first().click();
    await page.waitForTimeout(300);
  }
  await expect(page.getByText("练习完成")).toBeVisible({ timeout: 30_000 });
  await shot(page, "08-practice-done.png");

  // 10) 巩固板块：冷启动问卷（若出现）→ 今日任务页
  await page.goto("/app/review");
  const surveyLink = page.getByRole("link", { name: "开始问卷" });
  await surveyLink.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  if (await surveyLink.count()) {
    await surveyLink.click();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "完成设置" }).click();
    await page.getByRole("link", { name: "进入今日复习" }).click({ timeout: 15_000 });
  }
  await page.waitForURL("**/app/review", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "今天要复习什么" })).toBeVisible({ timeout: 15_000 });
  await shot(page, "09-review-today.png");
  const hasTask = (await page.getByRole("button", { name: "开始复习" }).count()) > 0;
  // 练习后至少应产生记忆状态；首次复习任务今天或日历上可见
  if (hasTask) {
    await page.getByRole("button", { name: "开始复习" }).first().click();
    await page.getByRole("button", { name: "显示答案" }).click();
    await page.getByRole("button", { name: "轻松答对" }).click();
    await expect(page.getByText(/今日任务已完成|个任务/).first()).toBeVisible({ timeout: 30_000 });
    await shot(page, "10-review-complete.png");
  }

  // 11) 复习日历上有未来安排（来自 ReviewTask 数据，非静态文案）
  await page.goto("/app/review/calendar");
  await expect(page.getByText("复习日历")).toBeVisible();
  await shot(page, "11-review-calendar.png");

  // 12) 记忆状态已产生（通过后端确认 ReviewTask/日历为真实数据）
  const tasks = await page.request.get(`${API}/api/v1/review/tasks`, { headers: authz });
  expect(tasks.ok()).toBeTruthy();
  const calendar = await page.request.get(`${API}/api/v1/review/calendar?days=30`, {
    headers: authz,
  });
  const calJson = await calendar.json();
  expect(Array.isArray(calJson)).toBe(true);
  expect(calJson.some((d: { count: number }) => d.count > 0)).toBe(true);
});
