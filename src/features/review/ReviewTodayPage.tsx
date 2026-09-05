import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Button, Card, CardHeader, EmptyState, Skeleton, Textarea } from "../../components/ui/kit";
import { cn, formatDateTime, renderMath } from "../../lib/utils";

const STAGE_HINT: Record<number, string> = { 1: "做错了", 2: "有点勉强", 3: "正常答对", 4: "轻松答对" };

export default function ReviewTodayPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["review-profile"],
    queryFn: async () => (await api.GET("/review/profile")).data,
  });
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["review-tasks-today"],
    queryFn: async () => (await api.GET("/review/tasks")).data ?? [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["review-tasks-today"] });
    queryClient.invalidateQueries({ queryKey: ["review-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["memory-state"] });
  };

  const complete = useMutation({
    mutationFn: async (args: { taskId: string; questionId: string; isCorrect: boolean; confidence: number }) => {
      const { error } = await api.POST("/review/tasks/{task_id}/complete", {
        params: { path: { task_id: args.taskId } },
        body: { question_id: args.questionId, answer, is_correct: args.isCorrect, confidence: args.confidence, hint_count: 0, answer_change_count: 0, grading_source: "self" },
      });
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: () => {
      setActiveId(null);
      setRevealed(false);
      setAnswer("");
      invalidate();
    },
    onError: (e: Error) => alert(e.message),
  });

  const skip = useMutation({
    mutationFn: async (taskId: string) => {
      await api.POST("/review/tasks/{task_id}/skip", { params: { path: { task_id: taskId } } });
    },
    onSuccess: invalidate,
  });
  const snooze = useMutation({
    mutationFn: async (taskId: string) => {
      await api.POST("/review/tasks/{task_id}/snooze", { params: { path: { task_id: taskId } }, params2: {} } as never);
    },
    onSuccess: invalidate,
  });
  const mastered = useMutation({
    mutationFn: async (taskId: string) => {
      await api.POST("/review/tasks/{task_id}/mastered", { params: { path: { task_id: taskId } } });
    },
    onSuccess: invalidate,
  });

  if (profile && !profile.onboarded) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <h2 className="font-serif text-xl font-semibold">欢迎使用巩固</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            先花 30 秒做一个小问卷，让系统了解你的节奏——之后它会完全跟随你的真实学习行为。
          </p>
          <Link to="/app/review/onboarding" className="mt-5 inline-block">
            <Button>开始问卷</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const pending = (tasks ?? []).filter((t) => t.status !== "completed");
  const active = tasks?.find((t) => t.id === activeId) ?? null;
  const doneCount = (tasks?.length ?? 0) - pending.length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">今天要复习什么</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            {tasks === undefined ? "加载中…" : pending.length === 0 ? "今日任务已完成" : `${pending.length} 个任务 · 已完成 ${doneCount}`}
          </p>
        </div>
        <Link to="/app/review/calendar" className="text-[13px] font-medium text-brand-600 hover:underline">
          查看日历 →
        </Link>
      </div>

      {isLoading && <Skeleton className="h-40" />}

      {active ? (
        <Card>
          <CardHeader
            title="复习这道题"
            action={
              <Button size="sm" variant="ghost" onClick={() => { setActiveId(null); setRevealed(false); setAnswer(""); }}>
                暂时退出
              </Button>
            }
          />
          <div className="p-5">
            <p className="text-[13px] text-ink-500">
              上次：{active.last_rating === 1 ? "做错" : active.last_rating === 2 ? "有点勉强" : active.last_rating ? "答对了" : "首次复习"} ·
              预计当前记忆保持 {active.retrievability != null ? Math.round(active.retrievability * 100) : "—"}%
            </p>
            <p className="mt-3 text-[15px] leading-relaxed">{renderMath(active.question?.stem ?? "")}</p>
            {active.question?.options && active.question.options.length > 0 && (
              <ul className="mt-4 space-y-2">
                {active.question.options.map((o) => (
                  <li key={o.key} className="text-sm">
                    <span className="mr-2 font-medium text-ink-500">{o.key}.</span>
                    {renderMath(o.text)}
                  </li>
                ))}
              </ul>
            )}
            {(active.question?.question_type === "fill_blank" || active.question?.question_type === "subjective") && (
              <Textarea className="mt-4" rows={2} placeholder="先在脑子里回答，或写下要点…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            )}

            {!revealed ? (
              <Button className="mt-4" onClick={() => setRevealed(true)}>显示答案</Button>
            ) : (
              <>
                <div className="mt-4 rounded-md bg-ink-50 p-3 text-sm">
                  <p className="font-medium text-ink-700">答案：{active.question?.answer ? renderMath(active.question.answer) : "—"}</p>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-[13px] font-medium text-ink-700">回想得怎么样？（决定下次复习时间）</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((r) => (
                      <button
                        key={r}
                        disabled={complete.isPending}
                        onClick={() => complete.mutate({ taskId: active.id, questionId: active.question_id, isCorrect: r >= 3, confidence: r })}
                        className={cn(
                          "rounded-md border py-2.5 text-[13px] font-medium transition-colors",
                          r === 1 && "border-red-200 text-red-ink hover:bg-red-soft",
                          r === 2 && "border-amber-200 text-amber-accent hover:bg-amber-soft",
                          r >= 3 && "border-green-200 text-green-ink hover:bg-green-soft"
                        )}
                      >
                        {STAGE_HINT[r]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          {tasks !== undefined && tasks.length === 0 ? (
            <EmptyState
              title="今天没有需要复习的题目"
              hint="完成课堂练习后，复习任务会自动出现在这里。"
              action={<Link to="/app/practice"><Button size="sm">去练习</Button></Link>}
            />
          ) : pending.length === 0 && (tasks?.length ?? 0) > 0 ? (
            <EmptyState title="今日任务已完成" hint="记得明天回来——记忆在睡眠中巩固，按时复习效果最好。" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {pending.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.question?.stem ? String(renderMath(t.question.stem.replace(/\$[^$]+\$/g, "…"))).slice(0, 60) : `题目 #${t.question_id.slice(0, 6)}`}
                      </p>
                      <p className="mt-1 text-[12.5px] text-ink-500">
                        {t.reason} · 预计 {t.estimated_minutes} 分钟
                        {t.retrievability != null && <> · 当前记忆 {Math.round(t.retrievability * 100)}%</>}
                        {" · 到期 "}{formatDateTime(t.due_at)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setActiveId(t.id)}>开始复习</Button>
                  </div>
                  <div className="mt-2 flex gap-3 text-[12.5px]">
                    <button className="text-ink-500 hover:text-ink-700 hover:underline" onClick={() => skip.mutate(t.id)}>跳过</button>
                    <button className="text-ink-500 hover:text-ink-700 hover:underline" onClick={() => snooze.mutate(t.id)}>稍后提醒</button>
                    <button className="text-ink-500 hover:text-ink-700 hover:underline" onClick={() => mastered.mutate(t.id)}>已掌握（降低频率）</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <p className="text-center text-[12px] text-ink-300">
        复习安排由记忆模型（FSRS）+ 你的时间预算计算；跳过不会被视为答对。
      </p>
    </div>
  );
}
