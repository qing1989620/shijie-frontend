import { useMemo } from "react";

interface ForecastPoint {
  date: string;
  day: number;
  retrievability: number;
}

/** 记忆曲线：Y = 估算的回忆概率，X = 时间。 */
export function MemoryCurve({ points, nextReviewAt }: { points: ForecastPoint[]; nextReviewAt: string | null }) {
  const W = 560;
  const H = 180;
  const PAD = { l: 40, r: 16, t: 12, b: 26 };

  const { path, area, nextX, lastX } = useMemo(() => {
    if (!points?.length) return { path: "", area: "", nextX: null as number | null, lastX: 0 };
    const n = points.length;
    const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
    const y = (r: number) => PAD.t + (1 - r) * (H - PAD.t - PAD.b);
    const pts = points.map((p, i) => `${x(i).toFixed(1)},${y(p.retrievability).toFixed(1)}`);
    const line = `M${pts.join(" L")}`;
    const fill = `${line} L${x(n - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
    // next review date marker (extrapolate position from date)
    let nx: number | null = null;
    if (nextReviewAt) {
      const due = new Date(nextReviewAt);
      const first = new Date(points[0].date + "T00:00:00Z");
      const last = new Date(points[points.length - 1].date + "T00:00:00Z");
      const frac = (due.getTime() - first.getTime()) / (last.getTime() - first.getTime());
      if (frac >= 0 && frac <= 1) nx = x(frac * (n - 1));
    }
    return { path: line, area: fill, nextX: nx, lastX: x(n - 1) };
  }, [points, nextReviewAt]);

  if (!points?.length) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="记忆保持率曲线（估算）">
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const yy = PAD.t + (1 - r) * (H - PAD.t - PAD.b);
        return (
          <g key={r}>
            <line x1={PAD.l} y1={yy} x2={W - PAD.r} y2={yy} stroke="#eceef1" strokeWidth="1" />
            <text x={PAD.l - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#b8bec7">
              {r * 100}%
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d7d6f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#1d7d6f" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#curve-fill)" />
      <path d={path} fill="none" stroke="#14655A" strokeWidth="2" />
      {/* next review marker */}
      {nextX !== null && (
        <g>
          <line x1={nextX} y1={PAD.t} x2={nextX} y2={H - PAD.b} stroke="#b45309" strokeWidth="1.2" strokeDasharray="4 3" />
          <text x={nextX} y={PAD.t + 10} textAnchor="middle" fontSize="10" fill="#b45309">下次复习</text>
        </g>
      )}
      <text x={lastX} y={H - PAD.b + 14} textAnchor="end" fontSize="10" fill="#b8bec7">未来 30 天</text>
      <text x={PAD.l} y={PAD.t - 2} fontSize="10" fill="#b8bec7">回忆概率（估算）</text>
    </svg>
  );
}
