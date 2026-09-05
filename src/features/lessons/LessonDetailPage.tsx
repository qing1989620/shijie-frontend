import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { Badge, Button, Card, CardHeader, EmptyState, Textarea } from "../../components/ui/kit";
import { formatMs, renderMath } from "../../lib/utils";

const STAGES = ["排队中", "整理转写片段", "生成课堂总结", "识别知识点", "完成"] as const;

export default function LessonDetailPage() {
  const { lessonId = "" } = useParams();
  const queryClient = useQueryClient();
  const [searchResult, setSearchResult] = useState<{ explanation: string | null; results: { question: { id: string; stem: string; difficulty: number; subject: string | null }; band: string | null; relevance_reason: string | null }[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [editingSeg, setEditingSeg] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => (await api.GET("/lessons/{lesson_id}", { params: { path: { lesson_id: lessonId } } })).data,
  });
  const { data: transcript } = useQuery({
    queryKey: ["transcript", lessonId],
    queryFn: async () => (await api.GET("/lessons/{lesson_id}/transcript", { params: { path: { lesson_id: lessonId } } })).data,
  });
  const { data: summary } = useQuery({
    queryKey: ["summary", lessonId],
    queryFn: async () => (await api.GET("/lessons/{lesson_id}/summary", { params: { path: { lesson_id: lessonId } } })).data,
  });

  const summaryJob = useMutation({
    mutationFn: async () => (await api.POST("/lessons/{lesson_id}/summary-jobs", { params: { path: { lesson_id: lessonId } } })).data,
    onSuccess: async (job) => {
      if (!job) return;
      // poll job until done (SSE 可选升级；当前用 800ms 轮询 + 阶段展示)
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const { data } = await api.GET("/jobs/{job_id}", { params: { path: { job_id: job.job_id } } });
        if (data?.status === "succeeded" || data?.status === "failed") break;
      }
      await queryClient.invalidateQueries({ queryKey: ["summary", lessonId] });
      await queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const doSearch = async () => {
    setSearching(true);
    setSearchEmpty(false);
    try {
      const { data, error } = await api.POST("/lessons/{lesson_id}/exercise-searches", {
        params: { path: { lesson_id: lessonId } },
      });
      if (error) {
        setSearchEmpty(true);
        setSearchResult(null);
        return;
      }
      setSearchEmpty((data?.results?.length ?? 0) === 0);
      setSearchResult(data ?? null);
    } finally {
      setSearching(false);
    }
  };

  const favorite = useMutation({
    mutationFn: async (qid: string) => api.POST("/questions/{question_id}/favorite", { params: { path: { question_id: qid } } }),
  });

  const saveSeg = useMutation({
    mutationFn: async (args: { id: string; version: number }) => {
      const { error, response } = await api.PATCH("/transcript-segments/{segment_id}", {
        params: { path: { segment_id: args.id } },
        body: { text: editText, version: args.version } as never,
      });
      if (error) {
        const detail = (error as { detail?: string }).detail;
        throw new Error(response.status === 409 ? "该片段已被其他窗口修改，请刷新后重试" : String(detail ?? "保存失败"));
      }
    },
    onSuccess: () => {
      setEditingSeg(null);
      queryClient.invalidateQueries({ queryKey: ["transcript", lessonId] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const summaryPayload = summary?.payload as {
    title?: string; overview?: string;
    topics?: { topic: string; summary: string; timestamp_range?: number[] }[];
    key_concepts?: { concept: string; definition: string }[];
    teacher_emphasis?: string[];
    review_focus?: string[];
    uncertain?: boolean;
  } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{lesson?.title ?? "课堂详情"}</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            {lesson?.subject} {lesson?.grade ? `· ${lesson.grade}` : ""} · 状态 {lesson?.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/lessons/${lessonId}/record`}>
            <Button variant="outline">录音转写</Button>
          </Link>
          <Button onClick={() => summaryJob.mutate()} loading={summaryJob.isPending} disabled={!transcript?.items?.length}>
            生成课堂笔记
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 课堂转写 */}
        <Card>
          <CardHeader title="课堂转写" action={<Badge>{transcript?.items?.length ?? 0} 个片段</Badge>} />
          {!transcript || transcript.items.length === 0 ? (
            <EmptyState
              title="还没有转写内容"
              hint="点击「录音转写」开始录制；或上传录音后系统自动转写。"
              action={<Link to={`/app/lessons/${lessonId}/record`}><Button size="sm">开始录音</Button></Link>}
            />
          ) : (
            <ul className="scroll-thin max-h-[480px] divide-y divide-ink-100 overflow-y-auto">
              {transcript.items.map((seg) => (
                <li key={seg.id} className="group px-5 py-3">
                  <div className="flex items-center gap-2 text-[12px] text-ink-500">
                    <span className="tabular-nums">{formatMs(seg.start_ms)}</span>
                    {seg.confidence != null && <span>· 置信 {Math.round(seg.confidence * 100)}%</span>}
                    <button
                      className="ml-auto text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                      onClick={() => {
                        setEditingSeg(seg.id);
                        setEditText(seg.text);
                      }}
                    >
                      编辑
                    </button>
                  </div>
                  {editingSeg === seg.id ? (
                    <div className="mt-2">
                      <Textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" loading={saveSeg.isPending} onClick={() => saveSeg.mutate({ id: seg.id, version: seg.version })}>
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSeg(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed">{seg.text}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 课堂总结 */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="课堂笔记" />
            {summaryJob.isPending && (
              <div className="px-5 py-4 text-[13px] text-ink-500">正在生成：{STAGES[Math.min(2, Math.floor(Date.now() / 5000) % 4)]}…</div>
            )}
            {!summary && !summaryJob.isPending ? (
              <EmptyState
                title="还没有生成笔记"
                hint="基于课堂转写生成结构化笔记，可从笔记跳回原课堂位置。"
                action={
                  <Button size="sm" disabled={!transcript?.items?.length} onClick={() => summaryJob.mutate()}>
                    生成课堂笔记
                  </Button>
                }
              />
            ) : (
              summaryPayload && (
                <div className="space-y-4 p-5">
                  {summaryPayload.uncertain && (
                    <p className="rounded-md bg-amber-soft px-3 py-2 text-[13px] text-amber-accent">
                      本堂课转写内容较少，笔记可能不完整。
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-ink-700">{summaryPayload.overview}</p>
                  {summaryPayload.topics?.map((t, i) => (
                    <div key={i} className="border-l-2 border-brand-100 pl-3">
                      <p className="text-sm font-medium">
                        {t.topic}
                        {t.timestamp_range && t.timestamp_range.length === 2 && (
                          <button
                            className="ml-2 text-[12px] font-normal text-brand-600 hover:underline"
                            onClick={() => document.getElementById(`seg-${t.timestamp_range![0]}`)?.scrollIntoView({ behavior: "smooth" })}
                          >
                            跳到 {formatMs(t.timestamp_range[0])}
                          </button>
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">{t.summary}</p>
                    </div>
                  ))}
                  {summaryPayload.teacher_emphasis && summaryPayload.teacher_emphasis.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[13px] font-medium text-ink-700">老师强调</p>
                      <div className="flex flex-wrap gap-1.5">
                        {summaryPayload.teacher_emphasis.map((e, i) => <Badge key={i} tone="brand">{e}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </Card>

          {/* 课堂找题（只检索、不生成） */}
          <Card>
            <CardHeader
              title="找相关练习"
              action={
                <Button size="sm" variant="outline" onClick={doSearch} loading={searching} disabled={!summary}>
                  找相关练习
                </Button>
              }
            />
            {!searchResult && !searchEmpty && (
              <p className="px-5 py-6 text-[13px] text-ink-500">生成课堂笔记后，即可围绕本课知识点检索真实题库中的练习。</p>
            )}
            {searchEmpty && (
              <p className="px-5 py-6 text-[13px] text-ink-500">没有找到足够相关的练习。可以稍后重试，或先在题库中补充题目。</p>
            )}
            {searchResult && (
              <ul className="divide-y divide-ink-100">
                {searchResult.results.map((r) => (
                  <li key={r.question.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed">{renderMath(r.question.stem)}</p>
                      <p className="mt-1 text-[12.5px] text-ink-500">
                        {r.relevance_reason} · 难度 {r.question.difficulty}/5
                        {r.band === "basic" && " · 基础"}
                        {r.band === "advanced" && " · 进阶"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Link to={`/app/questions/${r.question.id}`} className="text-[13px] text-brand-600 hover:underline">
                        查看
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => favorite.mutate(r.question.id)}
                        loading={favorite.isPending && favorite.variables === r.question.id}
                      >
                        收藏
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
