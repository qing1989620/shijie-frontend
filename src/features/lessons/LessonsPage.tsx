import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Button, Card, EmptyState, Input, Label, Modal, Skeleton } from "../../components/ui/kit";
import { formatDate } from "../../lib/utils";
import { LessonStatusBadge } from "../dashboard/DashboardPage";

export default function LessonsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => (await api.GET("/lessons", { params: { query: { limit: 50 } } })).data,
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/lessons", {
        body: { title: newTitle, subject: newSubject || undefined, grade: newGrade || undefined, tags: [] },
      });
      if (error) throw new Error(errMsg(error) || "创建失败");
    },
    onSuccess: () => {
      setModalOpen(false);
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const lessons = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">课堂</h1>
          <p className="mt-1 text-[13px] text-ink-500">录下课堂，剩下的交给整理。</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>新建课堂</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : lessons.length === 0 ? (
          <EmptyState
            title="还没有课堂"
            hint="课堂是学习闭环的起点：录入 → 整理 → 找练习 → 收藏。"
            action={<Button onClick={() => setModalOpen(true)}>创建第一节课堂</Button>}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link to={`/app/lessons/${l.id}`} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-ink-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {formatDate(l.created_at)}
                      {l.subject && ` · ${l.subject}`}
                      {l.grade && ` · ${l.grade}`}
                    </p>
                  </div>
                  <LessonStatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新建课堂">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            createLesson.mutate();
          }}
        >
          <Label htmlFor="lesson-title">课堂主题</Label>
          <Input id="lesson-title" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="例如：椭圆及其标准方程" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lesson-subject">学科</Label>
              <Input id="lesson-subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="数学" />
            </div>
            <div>
              <Label htmlFor="lesson-grade">年级</Label>
              <Input id="lesson-grade" value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="高一" />
            </div>
          </div>
          {error && <p role="alert" className="mt-2 text-[13px] text-red-ink">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="submit" loading={createLesson.isPending}>创建</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
