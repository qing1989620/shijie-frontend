import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg, tokens } from "../../stores/auth";
import { Button, Card, FieldError, Input, Label } from "../../components/ui/kit";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await api.POST("/auth/login", {
      body: { email, password },
    });
    setLoading(false);
    if (err) {
      setError(errMsg(err) || "登录失败，请检查邮箱与密码");
      return;
    }
    tokens.access = data.access_token;
    tokens.refresh = data.refresh_token;
    navigate("/app", { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* 左：品牌与价值主张（克制的排版，不做渐变图） */}
      <div className="hidden flex-1 flex-col justify-between bg-paper-warm p-12 lg:flex">
        <Brand />
        <div className="max-w-md">
          <h1 className="font-serif text-3xl leading-snug text-ink-950">
            一步一阶，
            <br />
            把课堂变成记忆。
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            录下一节课，系统帮你整理成笔记与知识点；围绕薄弱处练习；每道题都有专属的记忆节律，告诉你什么时候回来复习。
          </p>
          <div className="mt-8 flex items-center gap-6 text-[13px] text-ink-500">
            <Step n="1" label="课堂录入" />
            <Dashes />
            <Step n="2" label="针对练习" />
            <Dashes />
            <Step n="3" label="巩固复习" />
          </div>
        </div>
        <div className="text-[13px] text-ink-300">拾阶 · Learning Loop Platform</div>
      </div>

      {/* 右：登录表单 */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <Card className="w-full max-w-sm p-6">
          <div className="mb-5 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-lg font-semibold">登录</h2>
          <p className="mt-1 text-[13px] text-ink-500">欢迎回来，继续你的学习。</p>
          <form className="mt-5" onSubmit={submit}>
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <div className="mt-4">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <FieldError message={error} />
            <Button type="submit" className="mt-5 w-full" loading={loading}>
              登录
            </Button>
          </form>
          <p className="mt-4 text-center text-[13px] text-ink-500">
            还没有账号？
            <Link to="/register" className="ml-1 font-medium text-brand-600 hover:underline">
              注册
            </Link>
          </p>
          <div className="mt-4 rounded-md bg-ink-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-500">
            演示账号：<code className="text-ink-700">demo@shijie.app</code> / <code className="text-ink-700">demo12345</code>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">{n}</span>
      {label}
    </span>
  );
}

function Dashes() {
  return <span className="text-ink-300">- - -</span>;
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#14655A" />
        <path fill="#FFFFFF" d="M6 26v-6h6v-6h6V8h8v18H6z" />
        <circle cx="22" cy="14" r="1.8" fill="#14655A" />
      </svg>
      <span className="font-serif text-xl font-semibold">拾阶</span>
    </div>
  );
}
