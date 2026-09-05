import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { tokens } from "../../stores/auth";
import { cn } from "../../lib/utils";

/* 单色线性 SVG 图标（不用 emoji 贴纸） */
const icon = (d: string) =>
  function Icon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn("h-[18px] w-[18px]", className)} aria-hidden>
        <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

const Icons = {
  home: icon("M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5"),
  lesson: icon("M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13.5M4 19.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5M4 19.5A1.5 1.5 0 0 1 5.5 18H20M9 8h6M9 11.5h4"),
  practice: icon("M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V5Zm-1 8h2m-2 4h6m3.5-9.5L12 12l2.5 2.5"),
  review: icon("M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"),
  chart: icon("M4 20V10m6 10V4m6 16v-7m5 7H3"),
  cog: icon("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z"),
};

const NAV_MAIN = [
  { to: "/app", label: "首页", Icon: Icons.home, end: true },
  { to: "/app/lessons", label: "课堂", Icon: Icons.lesson },
  { to: "/app/practice", label: "练习", Icon: Icons.practice },
  { to: "/app/review", label: "巩固", Icon: Icons.review },
];

const NAV_SECONDARY = [
  { to: "/app/questions", label: "题库", Icon: Icons.lesson },
  { to: "/app/analytics", label: "学习数据", Icon: Icons.chart },
  { to: "/app/settings", label: "设置", Icon: Icons.cog },
];

export function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await api.POST("/auth/logout", { body: { refresh_token: tokens.refresh } });
    } catch {
      /* 本地登出始终成功 */
    }
    tokens.clear();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const item = (n: (typeof NAV_MAIN)[number]) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-100"
        )
      }
    >
      <n.Icon />
      {n.label}
    </NavLink>
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-100 bg-white px-3 py-5 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7" fill="#14655A" />
          <path fill="#FFFFFF" d="M6 26v-6h6v-6h6V8h8v18H6z" />
          <circle cx="22" cy="14" r="1.8" fill="#14655A" />
        </svg>
        <div>
          <div className="font-serif text-[17px] font-semibold leading-none">拾阶</div>
          <div className="mt-1 text-[11px] leading-none text-ink-500">学习闭环</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="主导航">
        {NAV_MAIN.map(item)}
      </nav>
      <div className="my-4 border-t border-ink-100" />
      <nav className="flex flex-col gap-1" aria-label="次导航">
        {NAV_SECONDARY.map(item)}
      </nav>

      <div className="mt-auto px-3">
        <button onClick={logout} className="text-[13px] text-ink-500 transition-colors hover:text-ink-700">
          退出登录
        </button>
      </div>
    </aside>
  );
}
