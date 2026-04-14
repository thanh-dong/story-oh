"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Volume2 } from "lucide-react";
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

  // Audio status
  const [audioStatus, setAudioStatus] = useState<{
    total: number;
    ready: number;
    missing: { id: string; word: string }[];
  } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenResult, setRegenResult] = useState<{ regenerated: number; failed: number } | null>(null);

  const fetchAudioStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/vocabulary/plans/${planId}/regenerate-audio`);
      if (res.ok) setAudioStatus(await res.json());
    } catch { /* ignore */ }
  }, [planId]);

  useEffect(() => {
    if (status === "active") fetchAudioStatus();
  }, [status, fetchAudioStatus]);

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenResult(null);
    let totalRegenerated = 0;
    let totalFailed = 0;

    try {
      // Loop in batches until no words remaining
      while (true) {
        const res = await fetch(`/api/vocabulary/plans/${planId}/regenerate-audio`, {
          method: "POST",
        });
        if (!res.ok) break;

        const result = await res.json();
        totalRegenerated += result.regenerated;
        totalFailed += result.failed;
        setRegenResult({ regenerated: totalRegenerated, failed: totalFailed });
        fetchAudioStatus();

        if (result.remaining <= 0) break;
      }
    } catch { /* ignore */ }
    setRegenerating(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card space-y-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-kid-pink" />
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
            className="h-full rounded-full bg-primary transition-all animate-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {quizAccuracy !== null && (
        <p className="text-sm text-muted-foreground">
          Quiz accuracy: {Math.round(quizAccuracy * 100)}%
        </p>
      )}

      {/* Audio status */}
      {status === "active" && audioStatus && (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Volume2 className="size-3.5" />
              Audio
            </span>
            <span className={audioStatus.missing.length > 0 ? "text-amber-600 font-semibold" : "text-green-600 font-semibold"}>
              {audioStatus.ready}/{audioStatus.total} ready
            </span>
          </div>
          {audioStatus.missing.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                {audioStatus.missing.length} word{audioStatus.missing.length > 1 ? "s" : ""} missing audio — tap regenerate to fix.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="w-full"
              >
                {regenerating ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="size-3.5 mr-1.5" />
                )}
                {regenerating ? "Regenerating..." : `Regenerate ${audioStatus.missing.length} audio`}
              </Button>
            </>
          )}
          {regenResult && (
            <p className="text-xs text-muted-foreground">
              {regenResult.regenerated} regenerated{regenResult.failed > 0 ? `, ${regenResult.failed} failed` : ""}
            </p>
          )}
        </div>
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
