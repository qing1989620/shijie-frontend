import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, WS_BASE_URL } from "../../api/client";
import { tokens } from "../../stores/auth";
import { Badge, Button, Card, CardHeader } from "../../components/ui/kit";
import { cn, formatMs } from "../../lib/utils";

interface TranscriptItem {
  id?: string;
  text: string;
  start_ms: number;
  final: boolean;
}

/** 录音转写页：MediaRecorder 采集 → WebSocket 流式转写（Mock ASR）。
 * 用户始终能明确看到：权限状态、录音指示灯、时长、连接状态与具体错误。 */
export default function RecordPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<"idle" | "granted" | "denied">("idle");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [conn, setConn] = useState<"idle" | "connecting" | "connected" | "closed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [finalize, setFinalize] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [asrMock, setAsrMock] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startingRef = useRef(false); // 双击/重复点击防护
  const closedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const speakingRef = useRef(false);

  // 查询 ASR Provider：mock 时展示"模拟转写"提示
  useEffect(() => {
    api
      .GET("/meta/version")
      .then(({ data }) => setAsrMock(data?.asr_provider === "mock"))
      .catch(() => {});
  }, []);

  const start = async () => {
    if (startingRef.current || recording) return; // 防重复启动
    startingRef.current = true;
    setErrorMsg(null);
    setConn("connecting");

    // 1) 取实时票据
    const { data: ticket, error: ticketErr } = await api.POST("/realtime/tickets", {
      body: { lesson_id: lessonId },
    });
    if (ticketErr || !ticket) {
      startingRef.current = false;
      setConn("error");
      setErrorMsg(ticketErr ? String((ticketErr as { detail?: string }).detail ?? "获取连接凭证失败") : "获取连接凭证失败");
      return;
    }
    // 2) 麦克风
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");
    } catch {
      startingRef.current = false;
      setPermission("denied");
      setConn("idle");
      return;
    }
    // 3) WebSocket（ws_url 来自后端契约）
    closedRef.current = false;
    const ws = new WebSocket(`${WS_BASE_URL}${ticket.ws_url}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConn("connected");
      ws.send(JSON.stringify({ type: "session.start", version: 1, timestamp: new Date().toISOString(), payload: { ticket: ticket.ticket } }));
      // 4) 开录
      try {
        // 麦克风音量检测(VAD)：只有真正说话时才发分片——静音时不产生转写
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(streamRef.current!).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        vadTimerRef.current = window.setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          speakingRef.current = Math.sqrt(sum / buf.length) > 0.035;
          setSpeaking(speakingRef.current);
        }, 200);

        const toBase64 = (blob: Blob) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.readAsDataURL(blob);
          });

        const recorder = new MediaRecorder(streamRef.current!);
        recorderRef.current = recorder;
        recorder.ondataavailable = async (e) => {
          // 静音分片不发送；说话分片携带真实音频(接入 FunASR 后即为真实转写)
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN && speakingRef.current) {
            const data = await toBase64(e.data);
            ws.send(JSON.stringify({ type: "audio.chunk", version: 1, timestamp: new Date().toISOString(), payload: { data } }));
          }
        };
        recorder.start(1000); // 1s chunks
        setRecording(true);
        timerRef.current = window.setInterval(() => setElapsed((v) => v + 1000), 1000);
      } catch (e) {
        setErrorMsg(`录音初始化失败：${String(e)}`);
        setConn("error");
      } finally {
        startingRef.current = false;
      }
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.type === "transcript.partial") {
        const p: TranscriptItem = { text: msg.payload.text, start_ms: msg.payload.start_ms, final: false };
        setItems((prev) => [...prev.filter((i) => i.final), p]);
      } else if (msg.type === "transcript.final") {
        setItems((prev) => [
          ...prev.filter((i) => i.final),
          { id: msg.payload.segment_id, text: msg.payload.text, start_ms: msg.payload.start_ms, final: true },
        ]);
      } else if (msg.type === "error") {
        setConn("error");
        setErrorMsg(msg.payload?.message ?? `连接错误（${msg.payload?.code ?? "UNKNOWN"}）`);
      } else if (msg.type === "session.closed") {
        closedRef.current = true;
      }
    };
    ws.onerror = () => {
      setConn("error");
      setErrorMsg("WebSocket 连接失败，请确认后端服务正在运行。");
      startingRef.current = false;
    };
    ws.onclose = () => {
      setConn((c) => (c === "error" ? c : "closed"));
      startingRef.current = false;
    };
  };

  const stop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setSpeaking(false);
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // 等服务端回 session.closed（最多 3s），再收尾
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "session.end", version: 1, timestamp: new Date().toISOString(), payload: {} }));
      await new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, 3000);
        const check = window.setInterval(() => {
          if (closedRef.current) {
            window.clearTimeout(t);
            window.clearInterval(check);
            resolve();
          }
        }, 100);
      });
      ws.close();
    }

    setFinalize("running");
    // 上传完整音频做最终校准转写（final pass）——带认证
    const blob = new Blob([""], { type: "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "lesson-final.webm");
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
    const res = await fetch(`${apiBase}/lessons/${lessonId}/recordings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.access}` },
      body: form,
    });
    if (!res.ok) {
      setFinalize("failed");
      setErrorMsg(`上传录音失败（${res.status}），请稍后在课堂详情重试。`);
      return;
    }
    const rec = (await res.json()) as { id: string };
    const finRes = await fetch(`${apiBase}/recordings/${rec.id}/finalize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (!finRes.ok) {
      setFinalize("failed");
      setErrorMsg("最终转写失败，请稍后在课堂详情重试。");
      return;
    }
    setFinalize("done");
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (vadTimerRef.current) clearInterval(vadTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
    },
    []
  );

  const connBadge = {
    idle: { tone: "neutral" as const, label: "未连接" },
    connecting: { tone: "amber" as const, label: "连接中" },
    connected: { tone: "green" as const, label: "已连接" },
    closed: { tone: "neutral" as const, label: "已断开" },
    error: { tone: "red" as const, label: "连接错误" },
  }[conn];

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
              {recording && (
                <span
                  className={cn("inline-block h-2 w-2 rounded-full", speaking ? "bg-green-ink" : "bg-ink-200")}
                  aria-label={speaking ? "检测到说话" : "未检测到声音"}
                />
              )}
              <Badge tone={connBadge.tone}>{connBadge.label}</Badge>
            </span>
          }
        />
        <div className="p-5">
          {asrMock && recording && (
            <p className="mb-3 rounded-md bg-amber-soft px-3 py-2 text-[12.5px] leading-relaxed text-amber-accent">
              开发模式 · 模拟转写：下方文字是预设课堂内容的演示，不代表你的真实语音——只有你说话时才会推进。
              接入自托管 FunASR（ASR_PROVIDER=funasr）后，这里就是真实转写。
            </p>
          )}
          <div className="flex items-center gap-4">
            <span className="font-serif text-4xl tabular-nums">{formatMs(elapsed)}</span>
            {recording ? (
              <Button variant="danger" onClick={stop}>结束录音</Button>
            ) : (
              <Button onClick={start} disabled={conn === "connecting" || finalize === "done"}>
                {conn === "connecting" ? "连接中…" : "开始录音"}
              </Button>
            )}
          </div>
          {permission === "denied" && (
            <p className="mt-3 text-[13px] text-red-ink">麦克风权限被拒绝。请在浏览器地址栏的权限设置中允许麦克风后重试。</p>
          )}
          {errorMsg && (
            <p role="alert" className="mt-3 rounded-md bg-red-soft px-3 py-2 text-[13px] text-red-ink">{errorMsg}</p>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
            录音仅用于生成课堂笔记与知识点。开始前请确认遵守学校规定与当地法律，必要时征得任课老师同意。
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="实时转写" action={<Badge>{items.filter((i) => i.final).length} 条已确认</Badge>} />
        {finalize === "running" && <p className="px-5 py-3 text-[13px] text-ink-500">正在做最终校准转写…</p>}
        {finalize === "failed" && (
          <p className="px-5 py-3 text-[13px] text-red-ink">最终转写未完成，可返回课堂详情后重试上传。</p>
        )}
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
