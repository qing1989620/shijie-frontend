import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Badge, Button, Card, CardHeader, Textarea } from "../../components/ui/kit";

interface OcrDraft {
  attachment_id: string;
  text: string;
  needs_review: boolean;
  notice?: string | null;
}

/** 错题上传：Upload → OCR → 预览 → 用户校对 → 确认入库。 */
export default function UploadPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [confirmedText, setConfirmedText] = useState("");
  const [subject, setSubject] = useState("数学");
  const [difficulty, setDifficulty] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/questions/ocr`, {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail ?? "上传失败");
        return;
      }
      setDraft(body as OcrDraft);
      setConfirmedText(body.text);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await api.POST("/questions/import", {
        body: {
          subject: subject || undefined,
          question_type: "subjective",
          stem: confirmedText,
          options: [],
          difficulty,
          origin: "upload",
          source_name: "错题上传",
        },
      });
      if (err || !data) {
        setError(errMsg(err) || "保存失败");
        return;
      }
      navigate(`/app/questions/${data.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">上传错题</h1>
        <p className="mt-1 text-[13px] text-ink-500">支持图片 / PDF / 纯文本。识别结果必须经过你的校对才会入库。</p>
      </div>

      {!draft && (
        <Card>
          <CardHeader title="选择文件" action={<Badge tone="amber">Mock OCR</Badge>} />
          <div className="p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) upload(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
                dragOver ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300"
              }`}
              role="button"
              aria-label="上传错题文件"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-3 text-ink-300" aria-hidden>
                <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-medium text-ink-700">拖放文件到此处，或点击选择</p>
              <p className="mt-1 text-[12.5px] text-ink-500">PNG / JPG / PDF / TXT，≤ 20MB。也可以直接粘贴文本到下方。</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
            </div>
            <div className="mt-4">
              <Textarea
                rows={4}
                placeholder="或直接粘贴题目文本…"
                onChange={(e) => setConfirmedText(e.target.value)}
                value={confirmedText}
              />
              <Button className="mt-3" onClick={confirm} loading={busy} disabled={!confirmedText.trim()}>
                直接保存为题目
              </Button>
            </div>
            {error && <p role="alert" className="mt-2 text-[13px] text-red-ink">{error}</p>}
          </div>
        </Card>
      )}

      {draft && (
        <Card>
          <CardHeader title="校对识别结果" action={<Badge tone="amber">需要人工校对</Badge>} />
          <div className="space-y-4 p-5">
            {draft.notice && <p className="rounded-md bg-amber-soft px-3 py-2 text-[13px] text-amber-accent">{draft.notice}</p>}
            <div>
              <label htmlFor="ocr-text" className="mb-1.5 block text-[13px] font-medium text-ink-700">
                题目内容（可直接修改）
              </label>
              <Textarea id="ocr-text" rows={8} value={confirmedText} onChange={(e) => setConfirmedText(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ocr-subject" className="mb-1.5 block text-[13px] font-medium text-ink-700">学科</label>
                <input
                  id="ocr-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-ink-200 px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ocr-difficulty" className="mb-1.5 block text-[13px] font-medium text-ink-700">难度（1-5）</label>
                <input
                  id="ocr-difficulty"
                  type="number"
                  min={1}
                  max={5}
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="h-9.5 w-full rounded-md border border-ink-200 px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>重新上传</Button>
              <Button onClick={confirm} loading={busy} disabled={!confirmedText.trim()}>
                确认入库
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
