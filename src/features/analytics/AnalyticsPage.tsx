import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Badge, Card, CardHeader, EmptyState, Skeleton } from "../../components/ui/kit";

export default function AnalyticsPage() {
  const { data: kps, isLoading } = useQuery({
    queryKey: ["knowledge-points"],
    queryFn: async () => (await api.GET("/knowledge-points")).data ?? [],
  });

  const withMastery = (kps ?? []).filter((k) => k.mastery !== null);
  const buckets = useMemo(() => {
    const weak = withMastery.filter((k) => (k.mastery ?? 0) < 0.4).length;
    const developing = withMastery.filter((k) => (k.mastery ?? 0) >= 0.4 && (k.mastery ?? 0) < 0.7).length;
    const strong = withMastery.filter((k) => (k.mastery ?? 0) >= 0.7).length;
    return { weak, developing, strong };
  }, [withMastery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">学习数据</h1>
        <p className="mt-1 text-[13px] text-ink-500">掌握度是根据学习行为的估算值，随每次练习与复习更新。</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : withMastery.length === 0 ? (
        <Card>
          <EmptyState
            title="还没有足够的学习数据"
            hint="完成几次练习或复习后，这里会展示知识点掌握地图。"
            action={<Link to="/app/practice" className="text-sm font-medium text-brand-600 hover:underline">去练习 →</Link>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="薄弱" value={buckets.weak} tone="red" hint="掌握 < 40%" />
            <StatCard label="发展中" value={buckets.developing} tone="amber" hint="40% - 70%" />
            <StatCard label="较扎实" value={buckets.strong} tone="green" hint="≥ 70%" />
          </div>

          <Card>
            <CardHeader title="知识点掌握列表" />
            <ul className="divide-y divide-ink-100">
              {withMastery.map((k) => (
                <li key={k.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-44 shrink-0 truncate text-sm">{k.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full ${
                        (k.mastery ?? 0) < 0.4 ? "bg-red-ink" : (k.mastery ?? 0) < 0.7 ? "bg-amber-accent" : "bg-green-ink"
                      }`}
                      style={{ width: `${Math.round((k.mastery ?? 0) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[12.5px] text-ink-500">
                    {Math.round((k.mastery ?? 0) * 100)}% · {k.question_count ?? 0} 题
                  </span>
                  <Badge tone={(k.mastery ?? 0) < 0.4 ? "red" : (k.mastery ?? 0) < 0.7 ? "amber" : "green"}>
                    {k.mastery_status === "weak" ? "薄弱" : k.mastery_status === "developing" ? "发展中" : "较扎实"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone, hint }: { label: string; value: number; tone: "red" | "amber" | "green"; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-ink-500">{label}</p>
      <p className={`mt-1 font-serif text-3xl font-semibold ${
        tone === "red" ? "text-red-ink" : tone === "amber" ? "text-amber-accent" : "text-green-ink"
      }`}>
        {value}
      </p>
      <p className="mt-1 text-[12px] text-ink-300">{hint}</p>
    </Card>
  );
}
