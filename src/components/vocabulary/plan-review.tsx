"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

interface PlanReviewProps {
  planId: string;
  plan: VocabularyPlan;
  creditsCost: number;
  status: string;
  onApproved: () => void;
  onRegenerated: () => void;
}

export function PlanReview({
  planId,
  plan,
  creditsCost,
  status,
  onApproved,
  onRegenerated,
}: PlanReviewProps) {
  const [loading, setLoading] = useState<"approve" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/vocabulary/plans/${planId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to approve");
        return;
      }
      onApproved();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        `Regenerating will cost additional credits. Continue?`
      )
    )
      return;

    setLoading("regenerate");
    setError(null);
    try {
      const res = await fetch(
        `/api/vocabulary/plans/${planId}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to regenerate");
        return;
      }
      onRegenerated();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {plan.weeks.map((week) => (
        <div key={week.weekNumber} className="space-y-3">
          <h3 className="font-bold text-lg">Week {week.weekNumber}</h3>
          <div className="space-y-2">
            {week.days.map((day) => (
              <div
                key={`${week.weekNumber}-${day.day}`}
                className="rounded-xl bg-card p-4 storybook-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">
                    Day {day.day}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span>{day.topic}</span>
                  {day.isReview && (
                    <Badge variant="secondary">Review</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {day.words.map((w) => (
                    <span
                      key={w.word}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {w.emoji} {w.word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {status === "draft" && (
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={loading !== null}
          >
            {loading === "approve"
              ? "Approving..."
              : `Approve (${creditsCost} credits)`}
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={loading !== null}
          >
            {loading === "regenerate" ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      )}

      {status === "approved" && (
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="font-semibold">Preparing audio...</p>
          <p className="text-sm text-muted-foreground">
            The plan will be ready for your child shortly.
          </p>
        </div>
      )}
    </div>
  );
}
