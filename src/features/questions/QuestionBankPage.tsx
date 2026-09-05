import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Badge, Button, Card, EmptyState, Input, Skeleton } from "../../components/ui/kit";
import { renderMath } from "../../lib/utils";

export default function QuestionBankPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["questions", search, favoritesOnly, wrongOnly],
    queryFn: async () =>
      (
        await api.GET("/questions", {
          params: { query: { limit: 30, search: search || undefined, favorites_only: favoritesOnly || undefined, wrong_only: wrongOnly || undefined } },
        })
      ).data,
  });

  const unfavorite = async (qid: string) => {
    await api.DELETE("/questions/{question_id}/favorite", { params: { path: { question_id: qid } } });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  };

  const items = data?.items ?? [];
  const stats = useMemo(
    () => ({ total: data?.items.length ?? 0, favorites: items.filter((q) => q.is_favorite).length }),
    [data, items]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">我的题库</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            课堂收藏、上传错题统一在这里 {stats.total > 0 && `· ${stats.total} 道可见`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/questions/upload"><Button variant="outline">上传错题</Button></Link>
          <Link to="/app/practice"><Button>随机练习</Button></Link>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder="搜索题目内容…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索题目"
          />
          <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>仅收藏</FilterChip>
          <FilterChip active={wrongOnly} onClick={() => setWrongOnly((v) => !v)}>做错过的</FilterChip>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="还没有题目"
            hint="在课堂里「找相关练习」后收藏，或上传自己的错题。"
            action={<Link to="/app/questions/upload"><Button size="sm">上传错题</Button></Link>}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <Link to={`/app/questions/${q.id}`} className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-relaxed">{renderMath(q.stem)}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ink-500">
                    {q.subject && <span>{q.subject}</span>}
                    <span>难度 {q.difficulty}/5</span>
                    {q.analysis_summary && <Badge tone="brand">已分析</Badge>}
                  </p>
                </Link>
                <div className="shrink-0">
                  {q.is_favorite ? (
                    <button
                      className="text-[13px] text-amber-accent hover:underline"
                      onClick={() => unfavorite(q.id)}
                      aria-label="取消收藏"
                    >
                      已收藏
                    </button>
                  ) : (
                    <span className="text-[13px] text-ink-300">未收藏</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
    </button>
  );
}
