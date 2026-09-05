import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Button, Card, Input, Label } from "../../components/ui/kit";
import { cn } from "../../lib/utils";

const STEPS = ["年级与主科", "复习节奏", "目标与考试"] as const;

/** 巩固模块冷启动问卷——只是先验（prior），长期真实行为会逐步覆盖它。 */
export default function ReviewOnboardingPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [preferredTime, setPreferredTime] = useState("20:00");
  const [density, setDensity] = useState<"little_often" | "focused" | null>(null);
  const [targetRetention, setTargetRetention] = useState(0.9);
  const [examDate, setExamDate] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      await api.PUT("/review/profile", {
        body: {
          grade: grade || undefined,
          primary_subject: subject || undefined,
          daily_minutes: dailyMinutes,
          preferred_time: preferredTime,
          target_retention: targetRetention,
          exam_date: examDate ? new Date(`${examDate}T00:00:00+08:00`).toISOString() : undefined,
          density_preference: density ?? undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-profile"] });
      queryClient.invalidateQueries({ queryKey: ["review-tasks-today"] });
    },
  });

  const dailyLoad = useMemo(() => {
    // 说明性提示：按平均 3 分钟/题估算今日可容纳题量
    return Math.max(1, Math.floor(dailyMinutes / 3));
  }, [dailyMinutes]);

  if (save.isSuccess) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <h2 className="font-serif text-xl font-semibold">设置完成</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            这些偏好只是起点——随着你的真实学习行为积累，系统会逐渐以行为数据为准。
          </p>
          <Link to="/app/review" className="mt-5 inline-block"><Button>进入今日复习</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
              i <= step ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>{i + 1}</span>
            <span className={cn("text-[13px]", i === step ? "font-medium text-ink-900" : "text-ink-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-ink-200" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ob-grade">年级</Label>
              <Input id="ob-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="例如：高一" />
            </div>
            <div>
              <Label htmlFor="ob-subject">主要学科</Label>
              <Input id="ob-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例如：数学" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ob-minutes">每天可用于复习的时间（分钟）：{dailyMinutes}</Label>
              <input
                id="ob-minutes"
                type="range"
                min={5}
                max={60}
                step={5}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full accent-[#14655A]"
              />
              <p className="mt-1 text-[12.5px] text-ink-500">大约可容纳 {dailyLoad} 道题（按平均 3 分钟/题估算）。</p>
            </div>
            <div>
              <Label htmlFor="ob-time">通常在什么时间复习</Label>
              <Input id="ob-time" type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-700">更喜欢哪种节奏？</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDensity("little_often")} aria-pressed={density === "little_often"}
                  className={cn("rounded-md border p-3 text-[13px]", density === "little_often" ? "border-brand-500 bg-brand-50" : "border-ink-200")}>
                  少量多次
                </button>
                <button onClick={() => setDensity("focused")} aria-pressed={density === "focused"}
                  className={cn("rounded-md border p-3 text-[13px]", density === "focused" ? "border-brand-500 bg-brand-50" : "border-ink-200")}>
                  集中复习
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ob-retention">希望记多牢？目标记忆保持率：{Math.round(targetRetention * 100)}%</Label>
              <input
                id="ob-retention"
                type="range"
                min={0.7}
                max={0.95}
                step={0.05}
                value={targetRetention}
                onChange={(e) => setTargetRetention(Number(e.target.value))}
                className="w-full accent-[#14655A]"
              />
              <p className="mt-1 text-[12.5px] text-ink-500">越高记得越牢，但复习会更频繁。</p>
            </div>
            <div>
              <Label htmlFor="ob-exam">考试日期（可选）</Label>
              <Input id="ob-exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              <p className="mt-1 text-[12.5px] text-ink-500">临近考试时，系统会适度提高薄弱题目的优先级。</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? history.back() : setStep(step - 1))}>
          {step === 0 ? "跳过" : "上一步"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>下一步</Button>
        ) : (
          <Button onClick={() => save.mutate()} loading={save.isPending}>完成设置</Button>
        )}
      </div>
    </div>
  );
}
