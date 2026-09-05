import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { errMsg } from "../../stores/auth";
import { Button, Card, CardHeader, Input, Label } from "../../components/ui/kit";
import { cn } from "../../lib/utils";

/** 随机 / 智能组题入口。 */
export default function PracticeSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"random" | "smart">("random");
  const [count, setCount] = useState(5);
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState<number | "">("");
  const [wrongOnly, setWrongOnly] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: kpsData } = useQuery({
    queryKey: ["knowledge-points"],
    queryFn: async () => (await api.GET("/knowledge-points")).data ?? [],
  });
  const kps = kpsData ?? [];
  const [selectedKps, setSelectedKps] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/practice-sets", {
        body: {
          mode,
          count,
          subject: subject || undefined,
          difficulty: typeof difficulty === "number" ? difficulty : undefined,
          wrong_only: wrongOnly,
          favorite_only: favoriteOnly,
          knowledge_point_ids: selectedKps,
        },
      });
      if (error) throw new Error(errMsg(error));
      return data!;
    },
    onSuccess: (ps) => {
      queryClient.invalidateQueries({ queryKey: ["practice-set"] });
      navigate(`/app/practice-sets/${ps.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">组一份练习</h1>
        <p className="mt-1 text-[13px] text-ink-500">题目顺序一旦生成即固定，刷新不会改变。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          active={mode === "random"}
          onClick={() => setMode("random")}
          title="纯随机"
          desc="按筛选条件完全随机抽取"
        />
        <ModeCard
          active={mode === "smart"}
          onClick={() => setMode("smart")}
          title="智能随机"
          desc="偏向：最近做错、薄弱知识点、记忆保持率低、久未练习"
        />
      </div>

      <Card>
        <CardHeader title="筛选条件" />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="p-count">数量</Label>
              <Input id="p-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="p-subject">学科（可选）</Label>
              <Input id="p-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="数学" />
            </div>
            <div>
              <Label htmlFor="p-difficulty">难度（可选）</Label>
              <Input
                id="p-difficulty"
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={wrongOnly} onClick={() => setWrongOnly((v) => !v)}>只练做错的</Chip>
            <Chip active={favoriteOnly} onClick={() => setFavoriteOnly((v) => !v)}>只练收藏的</Chip>
          </div>
          {kps.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-700">限定知识点（可选）</p>
              <div className="flex flex-wrap gap-1.5">
                {kps.slice(0, 12).map((k) => (
                  <Chip
                    key={k.id}
                    active={selectedKps.includes(k.id)}
                    onClick={() =>
                      setSelectedKps((prev) => (prev.includes(k.id) ? prev.filter((i) => i !== k.id) : [...prev, k.id]))
                    }
                  >
                    {k.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && <p role="alert" className="text-[13px] text-red-ink">{error}</p>}
      <Button className="w-full" onClick={() => create.mutate()} loading={create.isPending}>
        生成练习（{count} 题）
      </Button>
    </div>
  );
}

function ModeCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-card border p-4 text-left transition-colors",
        active ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white hover:border-ink-300"
      )}
      aria-pressed={active}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{desc}</p>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500 hover:text-ink-700"
      )}
    >
      {children}
    </button>
  );
}
