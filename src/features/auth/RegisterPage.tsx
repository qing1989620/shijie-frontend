import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Button, Card, FieldError, Input, Label } from "../../components/ui/kit";
import { Brand } from "./LoginPage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await api.POST("/auth/register", {
      body: { email, password, display_name: displayName || email.split("@")[0] },
    });
    if (err) {
      setLoading(false);
      setError(errMsg(err) || "注册失败");
      return;
    }
    // auto login after register
    const { data, error: loginErr } = await api.POST("/auth/login", { body: { email, password } });
    setLoading(false);
    if (loginErr || !data) {
      setError(errMsg(loginErr) || "注册成功，但自动登录失败，请手动登录");
      return;
    }
    const { tokens: t } = await import("../../stores/auth");
    t.access = data.access_token;
    t.refresh = data.refresh_token;
    navigate("/app", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-warm p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5">
          <Brand />
        </div>
        <h2 className="text-lg font-semibold">创建账号</h2>
        <p className="mt-1 text-[13px] text-ink-500">几秒钟，开始你的第一条学习数据链。</p>
        <form className="mt-5" onSubmit={submit}>
          <Label htmlFor="name">昵称</Label>
          <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="怎么称呼你" />
          <div className="mt-4">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="mt-4">
            <Label htmlFor="password">密码（至少 8 位）</Label>
            <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <FieldError message={error} />
          <Button type="submit" className="mt-5 w-full" loading={loading}>
            注册
          </Button>
        </form>
        <p className="mt-4 text-center text-[13px] text-ink-500">
          已有账号？
          <Link to="/login" className="ml-1 font-medium text-brand-600 hover:underline">
            登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
