"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [confirmProps, confirm] = useConfirmDialog();

  async function handleCancel(planId: string) {
    const ok = await confirm({
      title: "Cancel vocabulary plan?",
      description: "This will cancel the plan and it cannot be undone. Your credits will not be refunded.",
      confirmLabel: "Cancel Plan",
      variant: "destructive",
    });
    if (!ok) return;
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

  const confirmDialog = <ConfirmDialog {...confirmProps} loading={cancelling} />;

  // Show active/approved plan progress + full plan details
  if (activePlan) {
    return (
      <div className="space-y-6">
        {confirmDialog}
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

        {/* Full plan details */}
        <h2 className="text-lg font-bold pt-2">Plan Details</h2>
        <PlanReview
          planId={activePlan.id}
          plan={activePlan.plan}
          creditsCost={activePlan.creditsCost}
          status={activePlan.status}
          onApproved={() => {}}
          onRegenerated={() => {}}
        />
      </div>
    );
  }

  // Show draft plan for review
  if (draftPlan) {
    return (
      <div className="space-y-6">
        {confirmDialog}
        <h2 className="text-lg font-bold">Review & Edit Plan</h2>
        <p className="text-sm text-muted-foreground">
          Click a topic name to rename it. Hover a word to remove it. Click + Add to add words.
        </p>
        <PlanReview
          planId={draftPlan.id}
          plan={draftPlan.plan}
          creditsCost={draftPlan.creditsCost}
          status={draftPlan.status}
          editable
          onApproved={() => router.refresh()}
          onRegenerated={() => router.refresh()}
          onPlanUpdated={() => router.refresh()}
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
