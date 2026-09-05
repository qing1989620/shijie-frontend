import { clsx, type ClassValue } from "clsx";
import { useMemo } from "react";
import katex from "katex";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format milliseconds as m:ss. */
export function formatMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hh}:${mm}`;
}

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Render text containing $...$ / $$...$$ LaTeX via KaTeX into React nodes. */
export function useMath(text: string): React.ReactNode {
  return useMemo(() => renderMath(text ?? ""), [text]);
}

export function renderMath(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const isBlock = Boolean(m[1]);
    const tex = (m[1] ?? m[2] ?? "").trim();
    try {
      const html = katex.renderToString(tex, {
        displayMode: isBlock,
        throwOnError: false,
        output: "html",
      });
      parts.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: html }} />
      );
    } catch {
      parts.push(tex);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Estimated task duration copy. */
export function minutesLabel(min: number): string {
  return min >= 1 ? `约 ${min} 分钟` : "不足 1 分钟";
}
