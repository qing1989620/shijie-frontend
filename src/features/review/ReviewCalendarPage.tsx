import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Badge, Card, CardHeader, Skeleton } from "../../components/ui/kit";
import { cn, todayLocal } from "../../lib/utils";

export default function ReviewCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["review-calendar"],
    queryFn: async () => (await api.GET("/review/calendar", { params: { query: { days: 31 } } })).data ?? [],
  });

  const today = todayLocal();
  const firstDow = data && data.length > 0 ? new Date(data[0].date + "T00:00:00").getDay() : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">复习日历</h1>
        <p className="mt-1 text-[13px] text-ink-500">每一格都来自真实的 ReviewTask，不是静态文案。</p>
      </div>

      <Card>
        <CardHeader title="未来 30 天" />
        {isLoading || !data ? (
          <div className="p-5"><Skeleton className="h-64" /></div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <div key={d} className="py-1 text-center text-[12px] font-medium text-ink-300">{d}</div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
              {data.map((day) => {
                const isToday = day.date === today;
                const isPast = day.date < today;
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "min-h-[64px] rounded-md border p-1.5",
                      isToday ? "border-brand-500 bg-brand-50" : "border-ink-100",
                      isPast && "opacity-50"
                    )}
                  >
                    <div className="text-[11px] text-ink-500">{Number(day.date.slice(-2))}</div>
                    {day.count > 0 && (
                      <div className="mt-0.5">
                        <Badge tone={isToday ? "brand" : day.count > 5 ? "amber" : "neutral"}>{day.count} 题</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {data && data.filter((d) => d.count > 0 && d.date >= today).length > 0 && (
        <Card>
          <CardHeader title="即将到来的复习" />
          <ul className="divide-y divide-ink-100">
            {data.filter((d) => d.count > 0 && d.date >= today).slice(0, 6).map((d) => (
              <li key={d.date} className="px-5 py-3">
                <p className="text-sm font-medium">
                  {d.date === today ? "今天" : d.date === data.find((x) => x.date > today)?.date ? "明天" : d.date}
                  <span className="ml-2 text-[12.5px] font-normal text-ink-500">{d.count} 个任务</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  {d.items.slice(0, 2).map((t) => `「题目 #${t.question_id.slice(0, 6)}」`).join("、")}
                  {d.count > 2 && ` 等 ${d.count} 题`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-center text-[12px] text-ink-300">
        <Link to="/app/review" className="text-brand-600 hover:underline">← 返回今日复习</Link>
      </p>
    </div>
  );
}
