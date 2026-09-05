import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { cn } from "../../lib/utils";

export function Topbar() {
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.GET("/users/me");
      return data;
    },
  });

  return (
    <header className="sticky top-0 z-10 border-b border-ink-100 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <div className="hidden text-[13px] text-ink-500 md:block">
          课堂 · 练习 · 巩固 —— 让每一节课变成可复习的记忆
        </div>
        <MobileNav />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-700">
            {(me?.display_name ?? "学")[0]}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const items = [
    { to: "/app", label: "首页" },
    { to: "/app/lessons", label: "课堂" },
    { to: "/app/practice", label: "练习" },
    { to: "/app/review", label: "巩固" },
  ];
  return (
    <nav className="flex items-center gap-1 md:hidden" aria-label="移动端导航">
      {items.map((i) => (
        <a
          key={i.to}
          href={i.to}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-700",
            location.pathname === i.to && "bg-brand-50 text-brand-700"
          )}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
