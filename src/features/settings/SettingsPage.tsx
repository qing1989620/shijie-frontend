import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Button, Card, CardHeader, Input, Label } from "../../components/ui/kit";
import { API_BASE_URL, WS_BASE_URL } from "../../api/client";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.GET("/users/me")).data,
  });

  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      await api.PATCH("/users/me", {
        body: {
          display_name: displayName || undefined,
          grade: grade || undefined,
        } as never,
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="mt-1 text-[13px] text-ink-500">个人资料与连接信息。</p>
      </div>

      <Card>
        <CardHeader title="个人资料" />
        <div className="space-y-4 p-5">
          <div>
            <Label htmlFor="s-name">昵称</Label>
            <Input id="s-name" placeholder={me?.display_name ?? ""} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-grade">年级</Label>
            <Input id="s-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="例如：高一" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate()} loading={save.isPending}>保存</Button>
            {saved && <span className="text-[13px] text-green-ink">已保存</span>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="连接信息" />
        <div className="space-y-2 p-5 text-[13px] text-ink-500">
          <p>API：<code className="text-ink-700">{API_BASE_URL}</code></p>
          <p>WebSocket：<code className="text-ink-700">{WS_BASE_URL}</code></p>
          <p className="pt-2 text-[12px] text-ink-300">
            开发模式提示：当前后端 LLM / ASR / OCR 使用 Mock Provider，功能链路完整可测；配置真实 Key 或自托管运行时后自动切换。
          </p>
        </div>
      </Card>
    </div>
  );
}
