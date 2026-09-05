import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api/client";
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton } from "../../components/ui/kit";
import { renderMath } from "../../lib/utils";
import { MemoryCurve } from "../../features/review/MemoryCurve";

interface TreeNode {
  name: string;
  role: string;
  level: number;
  description?: string;
  importance?: number;
  confidence?: number;
  mastery_estimate?: number | null;
  knowledge_point_id?: string | null;
  children: TreeNode[];
}

const ROLE_LABEL: Record<string, string> = {
  core: "核心",
  prerequisite: "前置",
  method: "方法",
  extension: "拓展",
};

export default function QuestionDetailPage() {
  const { questionId = "" } = useParams();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<TreeNode | null>(null);

  const { data: q } = useQuery({
    queryKey: ["question", questionId],
    queryFn: async () => (await api.GET("/questions/{question_id}", { params: { path: { question_id: questionId } } })).data,
  });

  const { data: tree, isFetching: treeLoading } = useQuery({
    queryKey: ["knowledge-tree", questionId],
    queryFn: async () => (await api.GET("/questions/{question_id}/knowledge-tree", { params: { path: { question_id: questionId } } })).data,
    retry: false,
  });

  const { data: memory } = useQuery({
    queryKey: ["memory-state", questionId],
    queryFn: async () => (await api.GET("/questions/{question_id}/memory-state", { params: { path: { question_id: questionId } } })).data,
    retry: false,
  });

  const { data: forecast } = useQuery({
    queryKey: ["memory-forecast", questionId],
    queryFn: async () => (await api.GET("/questions/{question_id}/memory-forecast", { params: { path: { question_id: questionId } } })).data,
    retry: false,
  });

  const analyze = useMutation({
    mutationFn: async () => {
      const { data: job } = await api.POST("/questions/{question_id}/analysis-jobs", { params: { path: { question_id: questionId } } });
      if (!job) return;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const { data } = await api.GET("/jobs/{job_id}", { params: { path: { job_id: job.job_id } } });
        if (data?.status === "succeeded" || data?.status === "failed") break;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-tree", questionId] }),
  });

  const specializedSearch = useMutation({
    mutationFn: async (kpId: string) => {
      const { data } = await api.POST("/knowledge-points/{kp_id}/exercise-searches", {
        params: { path: { kp_id: kpId } },
      });
      return data;
    },
  });

  const rootNode = tree?.tree as TreeNode | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="题目"
          action={
            <div className="flex items-center gap-2">
              {q?.subject && <Badge>{q.subject}</Badge>}
              {q && <Badge tone="neutral">难度 {q.difficulty}/5</Badge>}
              {q?.is_favorite && <Badge tone="amber">已收藏</Badge>}
            </div>
          }
        />
        <div className="p-5">
          <p className="text-[15px] leading-relaxed">{renderMath(q?.stem ?? "")}</p>
          {q?.options && q.options.length > 0 && (
            <ul className="mt-4 space-y-2">
              {q.options.map((o) => (
                <li key={o.key} className="flex gap-2 text-sm">
                  <span className="font-medium text-ink-500">{o.key}.</span>
                  <span>{renderMath(o.text)}</span>
                </li>
              ))}
            </ul>
          )}
          {q?.solution && (
            <details className="mt-4 rounded-md bg-ink-50 p-3">
              <summary className="cursor-pointer text-[13px] font-medium text-ink-700">查看解析</summary>
              <p className="mt-2 text-sm leading-relaxed">{renderMath(q.solution)}</p>
            </details>
          )}
        </div>
      </Card>

      {/* AI 剖析 → 知识点树 */}
      <Card>
        <CardHeader
          title="知识结构"
          action={
            !rootNode && (
              <Button size="sm" variant="outline" onClick={() => analyze.mutate()} loading={analyze.isPending}>
                分析知识结构
              </Button>
            )
          }
        />
        {treeLoading && <div className="p-5"><Skeleton className="h-24" /></div>}
        {!rootNode && !treeLoading && !analyze.isPending && (
          <EmptyState
            title="还没有分析过这道题"
            hint="系统将题目解剖为「前置 → 核心 → 方法 → 拓展」的知识点树，定位薄弱环节。"
          />
        )}
        {rootNode && (
          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-r border-ink-100 p-5">
              {typeof tree?.summary === "string" && <p className="mb-4 text-[13px] leading-relaxed text-ink-500">{tree.summary}</p>}
              <TreeView node={rootNode} onSelect={setSelected} selectedName={selected?.name} />
            </div>
            <div className="p-5">
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold">{selected.name}</h4>
                      <Badge tone="brand">{ROLE_LABEL[selected.role] ?? selected.role}</Badge>
                    </div>
                    {selected.description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{selected.description}</p>}
                  </div>
                  <div className="text-[13px] text-ink-700">
                    掌握估计：
                    {selected.mastery_estimate != null ? (
                      <span className="ml-1 font-medium">{Math.round(selected.mastery_estimate * 100)}%</span>
                    ) : (
                      <span className="ml-1 text-ink-500">暂无足够数据</span>
                    )}
                    <span className="ml-1.5 text-ink-300">（根据学习行为估算）</span>
                  </div>
                  {selected.knowledge_point_id && (
                    <div>
                      <Button
                        size="sm"
                        onClick={() => specializedSearch.mutate(selected.knowledge_point_id!)}
                        loading={specializedSearch.isPending}
                      >
                        找专项练习
                      </Button>
                      {specializedSearch.data && (
                        <ul className="mt-3 space-y-2">
                          {specializedSearch.data.results.slice(0, 5).map((r) => (
                            <li key={r.question.id} className="flex items-center justify-between gap-2 rounded-md border border-ink-100 px-3 py-2">
                              <span className="min-w-0 truncate text-[13px]">{renderMath(r.question.stem)}</span>
                              <span className="shrink-0 text-[12px] text-ink-500">
                                {r.band === "basic" ? "基础" : r.band === "advanced" ? "进阶" : "同级"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="pt-10 text-center text-[13px] text-ink-500">点击左侧知识点查看本题考察方式与掌握情况。</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 记忆曲线 */}
      <Card>
        <CardHeader title="我的记忆曲线" />
        {!memory || !forecast ? (
          <EmptyState title="还没有记忆数据" hint="完成一次作答后，这里会展示这道题的记忆节律。" />
        ) : (
          <div className="p-5">
            <MemoryCurve points={(forecast.points ?? []) as { date: string; day: number; retrievability: number }[]} nextReviewAt={memory.next_review_at ?? null} />
            <p className="mt-3 text-[12.5px] text-ink-500">
              稳定度 {memory.stability.toFixed(1)} 天 · 已复习 {memory.review_count} 次 · 遗忘 {memory.lapse_count} 次 ·
              {" "}下次复习 {memory.next_review_at ? new Date(memory.next_review_at).toLocaleDateString("zh-CN") : "—"}
              <span className="ml-1 text-ink-300">（根据学习行为估算，非精确测量）</span>
            </p>
            <Link to="/app/review" className="mt-2 inline-block text-[13px] text-brand-600 hover:underline">
              进入巩固 →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

function TreeView({ node, onSelect, selectedName, depth = 0 }: { node: TreeNode; onSelect: (n: TreeNode) => void; selectedName?: string; depth?: number }) {
  return (
    <div className={depth === 0 ? "space-y-1" : "ml-4 mt-1 space-y-1 border-l border-ink-100 pl-3"}>
      <button
        onClick={() => onSelect(node)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          selectedName === node.name ? "bg-brand-50 text-brand-700" : "hover:bg-ink-50"
        }`}
      >
        <span className="font-medium">{node.name}</span>
        <span className="text-[12px] text-ink-300">{ROLE_LABEL[node.role] ?? node.role}</span>
        {node.mastery_estimate != null && node.mastery_estimate < 0.5 && <Badge tone="amber">薄弱</Badge>}
      </button>
      {node.children?.map((c) => (
        <TreeView key={c.name} node={c} onSelect={onSelect} selectedName={selectedName} depth={depth + 1} />
      ))}
    </div>
  );
}
