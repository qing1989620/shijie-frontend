import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Badge, Button, Card, CardHeader, EmptyState, Textarea } from "../../components/ui/kit";
import { cn, renderMath } from "../../lib/utils";

const CONFIDENCE_LABELS = ["很不確定", "不太确定", "一般", "比较确定", "非常确定"].map((s) => s.replace("確", "确"));

export default function PracticeRunPage() {
  const { setId = "" } = useParams();
  const queryClient = useQueryClient();
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ correct: boolean | null }[]>([]);

  const { data: ps } = useQuery({
    queryKey: ["practice-set", setId],
    queryFn: async () => (await api.GET("/practice-sets/{set_id}", { params: { path: { set_id: setId } } })).data,
  });

  const submit = useMutation({
    mutationFn: async (args: { questionId: string; isCorrect: boolean | null; answer: string; grading: string }) => {
      const { data, error } = await api.POST("/practice-sets/{set_id}/attempts", {
        params: { path: { set_id: setId } },
        body: {
          question_id: args.questionId,
          answer: args.answer,
          is_correct: args.isCorrect ?? undefined,
          duration_ms: Date.now() - startedAt,
          confidence,
          hint_count: 0,
          answer_change_count: 0,
          grading_source: args.grading,
        },
      });
      if (error) throw new Error(errMsg(error));
      return data!;
    },
  });

  if (!ps) return <div className="p-10 text-center text-ink-500">加载中…</div>;
  if (ps.items.length === 0) {
    return <EmptyState title="这份练习没有题目" hint="回题库收藏或导入一些题目再试试。" />;
  }

  const item = ps.items[pos];
  const q = item.question;
  const isLast = pos === ps.items.length - 1;

  const gradeObjective = (): { correct: boolean; grading: string } | null => {
    if (q.question_type === "single_choice" || q.question_type === "true_false") {
      return { correct: answer.trim().toLowerCase() === (q.answer ?? "").trim().toLowerCase(), grading: "objective" };
    }
    return null;
  };

  const next = (isCorrect: boolean | null, grading: string) => {
    submit.mutate(
      { questionId: q.id, isCorrect, answer, grading },
      {
        onSuccess: () => {
          setResults((r) => [...r, { correct: isCorrect }]);
          if (isLast) {
            setFinished(true);
            queryClient.invalidateQueries({ queryKey: ["review-tasks-today"] });
            queryClient.invalidateQueries({ queryKey: ["knowledge-points"] });
          } else {
            setPos((p) => p + 1);
            setAnswer("");
            setRevealed(false);
            setConfidence(3);
            setStartedAt(Date.now());
          }
        },
        onError: (e: Error) => alert(e.message),
      }
    );
  };

  if (finished) {
    const correctCount = results.filter((r) => r.correct === true).length;
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <h2 className="font-serif text-2xl font-semibold">练习完成</h2>
          <p className="mt-2 text-sm text-ink-500">
            {correctCount} / {results.length} 题做对。系统已按你的表现更新记忆状态，并安排了后续复习。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/app/review"><Button>查看复习计划</Button></Link>
            <Link to="/app/practice"><Button variant="outline">再来一组</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-500">
          第 {pos + 1} / {ps.items.length} 题 · {ps.title}
        </p>
        <Badge tone="neutral">{q.subject ?? "未分类"}</Badge>
      </div>

      <Card>
        <div className="p-6">
          <p className="text-[15px] leading-relaxed">{renderMath(q.stem)}</p>
          {q.options && q.options.length > 0 && (
            <ul className="mt-5 space-y-2">
              {q.options.map((o) => (
                <li key={o.key}>
                  <button
                    onClick={() => {
                      setAnswer(o.key);
                      setRevealed(true);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
                      answer === o.key ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300"
                    )}
                  >
                    <span className="font-semibold text-ink-500">{o.key}</span>
                    <span>{renderMath(o.text)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(q.question_type === "fill_blank" || q.question_type === "subjective") && (
            <Textarea className="mt-5" rows={3} placeholder="写下你的答案…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          )}

          {revealed && (
            <div className="mt-4 rounded-md bg-ink-50 p-3 text-sm">
              <p className="font-medium text-ink-700">参考答案：{q.answer ? renderMath(q.answer) : "（本题无标准答案，请自评）"}</p>
              {q.solution && <p className="mt-1 text-ink-500">{renderMath(q.solution)}</p>}
            </div>
          )}
        </div>
      </Card>

      {revealed && (
        <Card>
          <CardHeader title="你的把握程度" />
          <div className="flex gap-2 p-4">
            {CONFIDENCE_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setConfidence(i + 1)}
                aria-pressed={confidence === i + 1}
                className={cn(
                  "flex-1 rounded-md border py-2 text-[13px] transition-colors",
                  confidence === i + 1 ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {!revealed ? (
          <Button disabled={!answer.trim()} onClick={() => setRevealed(true)}>
            提交答案
          </Button>
        ) : (
          <>
            {gradeObjective() ? (
              <Button onClick={() => { const g = gradeObjective()!; next(g.correct, g.grading); }} loading={submit.isPending}>
                判定并下一题
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => next(false, "self")}>我做错了</Button>
                <Button onClick={() => next(true, "self")} loading={submit.isPending}>我做对了</Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
