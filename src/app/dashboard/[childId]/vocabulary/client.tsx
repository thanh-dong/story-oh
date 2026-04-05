"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreatePlanDialog } from "@/components/vocabulary/create-plan-dialog";
import { PlanReview } from "@/components/vocabulary/plan-review";
import { PlanProgress } from "@/components/vocabulary/plan-progress";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

interface PlanRow {
  id: string;
  status: string;
  creditsCost: number;
  weekStartDate: string;
  weeksRequested: number;
  wordsTotal: number;
  wordsAudioReady: number;
  plan: VocabularyPlan;
  [key: string]: unknown;
}

interface VocabularyManageClientProps {
  childId: string;
  childAge: number;
  childName: string;
  learningLanguages: string[];
  activePlan: PlanRow | null;
  draftPlan: PlanRow | null;
}

export function VocabularyManageClient({
  childId,
  childAge,
  childName,
  learningLanguages,
  activePlan,
  draftPlan,
}: VocabularyManageClientProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel(planId: string) {
    if (!confirm("Are you sure you want to cancel this plan?")) return;
    setCancelling(true);
    try {
      await fetch(`/api/vocabulary/plans/${planId}/cancel`, {
        method: "POST",
      });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }

  // Show active/approved plan progress
  if (activePlan) {
    return (
      <div className="space-y-6">
        <PlanProgress
          planId={activePlan.id}
          plan={activePlan.plan}
          status={activePlan.status}
          weekStartDate={activePlan.weekStartDate}
          wordsTotal={activePlan.wordsTotal}
          wordsListened={0}
          quizAccuracy={null}
          onCancel={() => handleCancel(activePlan.id)}
        />
        {activePlan.status === "active" && (
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={() =>
              router.push(
                `/dashboard/${childId}/read/vocabulary/${activePlan.id}`
              )
            }
          >
            Open Vocabulary Learning
          </Button>
        )}
      </div>
    );
  }

  // Show draft plan for review
  if (draftPlan) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold">Review Plan</h2>
        <PlanReview
          planId={draftPlan.id}
          plan={draftPlan.plan}
          creditsCost={draftPlan.creditsCost}
          status={draftPlan.status}
          onApproved={() => router.refresh()}
          onRegenerated={() => router.refresh()}
        />
        <Button
          variant="outline"
          onClick={() => handleCancel(draftPlan.id)}
          disabled={cancelling}
        >
          {cancelling ? "Cancelling..." : "Discard Draft"}
        </Button>
      </div>
    );
  }

  // No plan — show create dialog
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl bg-parchment py-16 text-center">
      <span className="text-6xl">📖</span>
      <div>
        <p className="text-lg font-bold">No vocabulary plan yet</p>
        <p className="text-muted-foreground mt-1">
          Create a personalized vocabulary learning plan for {childName}
        </p>
      </div>
      <CreatePlanDialog
        childId={childId}
        childAge={childAge}
        learningLanguages={learningLanguages}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
