import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, WS_BASE_URL } from "../../api/client";
import { Badge, Button, Card, CardHeader } from "../../components/ui/kit";
import { cn, formatMs } from "../../lib/utils";

interface TranscriptItem {
  id?: string;
  text: string;
  start_ms: number;
  final: boolean;
}

/** 录音转写页：MediaRecorder 采集 → WebSocket 流式转写（Mock ASR）。
 * 用户始终能明确看到：权限状态、录音指示灯、时长、连接状态。 */
export default function RecordPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<"idle" | "granted" | "denied">("idle");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [conn, setConn] = useState<"idle" | "connected" | "closed" | "error">("idle");
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [finalize, setFinalize] = useState<"idle" | "running" | "done" | "failed">("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const partialRef = useRef<TranscriptItem | null>(null);

  const start = async () => {
    // 1) 取实时票据
    const { data: ticket } = await api.POST("/realtime/tickets", { body: { lesson_id: lessonId } });
    if (!ticket) return;
    // 2) 麦克风
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");
    } catch {
      setPermission("denied");
      return;
    }
    // 3) WebSocket（ws_url 来自后端契约，前端不硬编码路径）
    const ws = new WebSocket(`${WS_BASE_URL}${ticket.ws_url}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setConn("connected");
      ws.send(JSON.stringify({ type: "session.start", version: 1, timestamp: new Date().toISOString(), payload: { ticket: ticket.ticket } }));
      // 4) 开录
      const recorder = new MediaRecorder(streamRef.current!);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio.chunk", version: 1, timestamp: new Date().toISOString(), payload: {} }));
        }
      };
      recorder.start(1000); // 1s chunks
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((v) => v + 1000), 1000);
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.type === "transcript.partial") {
        const p = { text: msg.payload.text as string, start_ms: msg.payload.start_ms as number, final: false };
        partialRef.current = p;
        setItems((prev) => [...prev.filter((i) => i.final), p, ...prev.filter((i) => !i.final && i !== partialRef.current)]);
      } else if (msg.type === "transcript.final") {
        setItems((prev) => [...prev.filter((i) => i.final), { id: msg.payload.segment_id, text: msg.payload.text, start_ms: msg.payload.start_ms, final: true }]);
      } else if (msg.type === "error") {
        setConn("error");
      }
    };
    ws.onclose = () => setConn((c) => (c === "error" ? c : "closed"));
  };

  const stop = async () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.send(JSON.stringify({ type: "session.end", version: 1, timestamp: new Date().toISOString(), payload: {} }));
    wsRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setFinalize("running");
    // 上传完整音频做最终校准转写（final pass）
    const blob = new Blob([""], { type: "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "lesson-final.webm");
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/lessons/${lessonId}/recordings`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      setFinalize("failed");
      return;
    }
    const rec = (await res.json()) as { id: string };
    await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/recordings/${rec.id}/finalize`, { method: "POST" });
    setFinalize("done");
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">课堂录音转写</h1>
        <Button variant="ghost" onClick={() => navigate(`/app/lessons/${lessonId}`)}>返回课堂</Button>
      </div>

      <Card>
        <CardHeader
          title="录音控制"
          action={
            <span className="flex items-center gap-2">
              <span
                className={cn("inline-block h-2.5 w-2.5 rounded-full", recording ? "animate-pulse bg-red-ink" : "bg-ink-300")}
                aria-label={recording ? "正在录音" : "未在录音"}
              />
              <span className="text-[13px] text-ink-500">{recording ? "正在录音" : "未在录音"}</span>
              <Badge tone={conn === "connected" ? "green" : conn === "error" ? "red" : "neutral"}>
                {conn === "connected" ? "已连接" : conn === "error" ? "连接错误" : conn === "closed" ? "已断开" : "未连接"}
              </Badge>
            </span>
          }
        />
        <div className="p-5">
          <div className="flex items-center gap-4">
            <span className="font-serif text-4xl tabular-nums">{formatMs(elapsed)}</span>
            {recording ? (
              <Button variant="danger" onClick={stop}>结束录音</Button>
            ) : (
              <Button onClick={start} disabled={finalize === "done"}>开始录音</Button>
            )}
          </div>
          {permission === "denied" && (
            <p className="mt-3 text-[13px] text-red-ink">麦克风权限被拒绝。请在浏览器地址栏的权限设置中允许麦克风后重试。</p>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
            录音仅用于生成课堂笔记与知识点。开始前请确认遵守学校规定与当地法律，必要时征得任课老师同意。
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="实时转写" action={<Badge>{items.filter((i) => i.final).length} 条已确认</Badge>} />
        {finalize === "running" && <p className="px-5 py-3 text-[13px] text-ink-500">正在做最终校准转写…</p>}
        {finalize === "done" && (
          <p className="px-5 py-3 text-[13px] text-green-ink">
            最终转写完成。
            <button className="ml-2 text-brand-600 hover:underline" onClick={() => navigate(`/app/lessons/${lessonId}`)}>
              查看课堂详情
            </button>
          </p>
        )}
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-ink-500">开始录音后，这里会实时出现转写文字（灰色为未确认片段）。</p>
        ) : (
          <ul className="scroll-thin max-h-[420px] divide-y divide-ink-100 overflow-y-auto">
            {items.map((item, idx) => (
              <li key={idx} className={cn("px-5 py-3 text-sm", !item.final && "text-ink-300")}>
                <span className="mr-2 tabular-nums text-[12px] text-ink-300">{formatMs(item.start_ms)}</span>
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
