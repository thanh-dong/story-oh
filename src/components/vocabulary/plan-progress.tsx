"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

interface PlanProgressProps {
  planId: string;
  plan: VocabularyPlan;
  status: string;
  weekStartDate: string;
  wordsTotal: number;
  wordsListened: number;
  quizAccuracy: number | null;
  onCancel: () => void;
}

function getCurrentDay(weekStartDate: string): {
  weekNumber: number;
  day: number;
} {
  const start = new Date(weekStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const day = (diffDays % 7) + 1;
  return { weekNumber, day };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  approved: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  draft: "bg-purple-100 text-purple-800",
};

export function PlanProgress({
  planId,
  plan,
  status,
  weekStartDate,
  wordsTotal,
  wordsListened,
  quizAccuracy,
  onCancel,
}: PlanProgressProps) {
  const current = getCurrentDay(weekStartDate);
  const progressPercent =
    wordsTotal > 0 ? Math.round((wordsListened / wordsTotal) * 100) : 0;

  const todayTopic = plan.weeks
    .find((w) => w.weekNumber === current.weekNumber)
    ?.days.find((d) => d.day === current.day);

  return (
    <div className="rounded-2xl bg-card p-6 storybook-shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Vocabulary Plan</h3>
        <Badge className={STATUS_COLORS[status] || ""}>
          {status}
        </Badge>
      </div>

      {todayTopic && status === "active" && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">Today's topic</p>
          <p className="font-semibold">
            {todayTopic.words[0]?.emoji} {todayTopic.topic}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {wordsListened}/{wordsTotal} words ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {quizAccuracy !== null && (
        <p className="text-sm text-muted-foreground">
          Quiz accuracy: {Math.round(quizAccuracy * 100)}%
        </p>
      )}

      {(status === "active" || status === "approved" || status === "failed") && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel Plan
        </Button>
      )}
    </div>
  );
}
