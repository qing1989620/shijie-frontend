import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton } from "../../components/ui/kit";
import { formatDate, minutesLabel } from "../../lib/utils";

export default function DashboardPage() {
  const { data: tasks } = useQuery({
    queryKey: ["review-tasks-today"],
    queryFn: async () => (await api.GET("/review/tasks")).data ?? [],
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons", "recent"],
    queryFn: async () => (await api.GET("/lessons", { params: { query: { limit: 4 } } })).data,
  });
  const { data: questions } = useQuery({
    queryKey: ["questions", "recent"],
    queryFn: async () => (await api.GET("/questions", { params: { query: { limit: 5 } } })).data,
  });
  const { data: kps } = useQuery({
    queryKey: ["knowledge-points"],
    queryFn: async () => (await api.GET("/knowledge-points")).data ?? [],
  });

  const reviewCount = tasks?.filter((t) => t.status !== "completed").length ?? 0;
  const weakKps = (kps ?? []).filter((k) => (k.mastery ?? 1) < 0.5).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 核心视觉：课堂 → 练习 → 巩固 闭环 */}
      <section aria-label="学习闭环">
        <div className="flex items-center gap-3">
          <LoopNode to="/app/lessons" title="课堂" desc="录入与整理" />
          <LoopArrow />
          <LoopNode to="/app/practice" title="练习" desc="围绕薄弱处" />
          <LoopArrow />
          <LoopNode to="/app/review" title="巩固" desc="按遗忘节律" badge={reviewCount > 0 ? String(reviewCount) : undefined} />
          <LoopBack />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 今日复习 */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={`今天要复习什么${reviewCount > 0 ? ` · ${reviewCount} 个任务` : ""}`}
            action={
              <Link to="/app/review" className="text-[13px] font-medium text-brand-600 hover:underline">
                进入巩固
              </Link>
            }
          />
          {tasks === undefined ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : reviewCount === 0 ? (
            <EmptyState
              title="今天没有到期的复习任务"
              hint="完成课堂录入或练习后，系统会按你的记忆节律自动安排复习。"
              action={
                <Link to="/app/practice">
                  <Button variant="outline" size="sm">去练习</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {tasks.filter((t) => t.status !== "completed").slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.question?.stem ? stemText(t.question.stem) : `题目 #${t.question_id.slice(0, 6)}`}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {t.reason ?? "按记忆节律安排"} · {minutesLabel(t.estimated_minutes)}
                      {t.retrievability !== null && t.retrievability !== undefined && (
                        <> · 预计记忆 {Math.round(t.retrievability * 100)}%</>
                      )}
                    </p>
                  </div>
                  <Link to="/app/review">
                    <Button size="sm" variant="outline">复习</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 快捷操作 + 薄弱知识点 */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="快捷操作" />
            <div className="grid grid-cols-2 gap-2 p-4">
              <Link to="/app/lessons/new"><QuickAction label="开始课堂" /></Link>
              <Link to="/app/questions/upload"><QuickAction label="上传错题" /></Link>
              <Link to="/app/practice"><QuickAction label="随机抽查" /></Link>
              <Link to="/app/review"><QuickAction label="今日复习" /></Link>
            </div>
          </Card>
          <Card>
            <CardHeader title="最近薄弱知识点" action={
              <Link to="/app/analytics" className="text-[13px] text-brand-600 hover:underline">全部</Link>
            } />
            {weakKps.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-ink-500">练习后这里会展示你的薄弱知识点。</p>
            ) : (
              <ul className="space-y-2 px-5 py-4">
                {weakKps.map((k) => (
                  <li key={k.id} className="flex items-center justify-between">
                    <span className="text-sm">{k.name}</span>
                    <Badge tone="amber">掌握 {Math.round((k.mastery ?? 0) * 100)}%（估算）</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最近课堂 */}
        <Card>
          <CardHeader
            title="最近课堂"
            action={<Link to="/app/lessons" className="text-[13px] text-brand-600 hover:underline">全部课堂</Link>}
          />
          {(lessons?.items?.length ?? 0) === 0 ? (
            <EmptyState
              title="还没有课堂"
              hint="创建你的第一节课，录下老师的讲解。"
              action={<Link to="/app/lessons"><Button size="sm">创建第一节课堂</Button></Link>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {lessons?.items?.map((l) => (
                <li key={l.id}>
                  <Link to={`/app/lessons/${l.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="text-[12.5px] text-ink-500">{formatDate(l.created_at)} · {l.subject ?? "未分类"}</p>
                    </div>
                    <LessonStatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 题库概况 */}
        <Card>
          <CardHeader
            title="我的题库"
            action={<Link to="/app/questions" className="text-[13px] text-brand-600 hover:underline">进入题库</Link>}
          />
          {(questions?.items?.length ?? 0) === 0 ? (
            <EmptyState
              title="题库还是空的"
              hint="在课堂里收藏练习题，或上传自己的错题。"
              action={<Link to="/app/questions/upload"><Button size="sm" variant="outline">上传错题</Button></Link>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {questions?.items?.slice(0, 4).map((q) => (
                <li key={q.id}>
                  <Link to={`/app/questions/${q.id}`} className="block px-5 py-3 hover:bg-ink-50">
                    <p className="truncate text-sm">{stemText(q.stem)}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {q.subject ?? "未分类"} · 难度 {q.difficulty}/5 {q.is_favorite && "· 已收藏"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function stemText(stem: string): string {
  return stem.replace(/\$[^$]+\$/g, "…").replace(/\s+/g, " ").slice(0, 40) || "题目";
}

function LoopNode({ to, title, desc, badge }: { to: string; title: string; desc: string; badge?: string }) {
  return (
    <Link to={to} className="group flex-1 rounded-card border border-ink-100 bg-white p-4 shadow-card transition-colors hover:border-brand-500">
      <div className="flex items-center justify-between">
        <span className="font-serif text-lg font-semibold">{title}</span>
        {badge && <Badge tone="amber">{badge}</Badge>}
      </div>
      <p className="mt-1 text-[13px] text-ink-500">{desc}</p>
    </Link>
  );
}

function LoopArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-300" aria-hidden>
      <path d="M4 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoopBack() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brand-500" aria-label="循环" role="img">
      <path d="M20 12a8 8 0 1 1-8-8m8 8h-3m3-6v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LessonStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "neutral" | "brand" | "amber" | "green" | "red"; label: string }> = {
    draft: { tone: "neutral", label: "草稿" },
    recording: { tone: "amber", label: "录音中" },
    processing: { tone: "amber", label: "处理中" },
    ready: { tone: "green", label: "已就绪" },
    failed: { tone: "red", label: "失败" },
    archived: { tone: "neutral", label: "已归档" },
  };
  const v = map[status] ?? map.draft;
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

function QuickAction({ label }: { label: string }) {
  return (
    <div className="flex h-9 items-center justify-center rounded-md border border-ink-200 text-[13px] font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-600">
      {label}
    </div>
  );
}
