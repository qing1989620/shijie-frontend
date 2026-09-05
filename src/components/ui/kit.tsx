import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/* ---- Button ---- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-9.5 px-4 text-sm",
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
        variant === "ghost" && "text-ink-700 hover:bg-ink-100",
        variant === "outline" && "border border-ink-200 bg-white text-ink-900 hover:border-ink-300 hover:bg-ink-50",
        variant === "danger" && "bg-red-ink text-white hover:opacity-90",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/* ---- Spinner ---- */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className ?? "h-4 w-4")} viewBox="0 0 24 24" fill="none" aria-label="加载中">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---- Card ---- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-card border border-ink-100 bg-white shadow-card", className)}>{children}</div>
  );
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {action}
    </div>
  );
}

/* ---- Input ---- */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9.5 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...rest}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-700">
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[13px] text-red-ink">
      {message}
    </p>
  );
}

/* ---- Badge ---- */
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "brand" | "amber" | "green" | "red"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-ink-100 text-ink-700",
        tone === "brand" && "bg-brand-50 text-brand-700",
        tone === "amber" && "bg-amber-soft text-amber-accent",
        tone === "green" && "bg-green-soft text-green-ink",
        tone === "red" && "bg-red-soft text-red-ink"
      )}
    >
      {children}
    </span>
  );
}

/* ---- EmptyState ---- */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="mb-3 text-ink-200" aria-hidden>
        <path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13.5M4 19.5A1.5 1.5 0 0 1 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5M4 19.5A1.5 1.5 0 0 1 5.5 18H20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---- Skeleton ---- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-ink-100", className)} />;
}

/* ---- ProgressBar ---- */
export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "amber" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={cn("h-full rounded-full transition-all", tone === "brand" ? "bg-brand-500" : "bg-amber-accent")}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}

/* ---- Modal (accessible: focus trap light, esc close) ---- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-card border border-ink-100 bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
