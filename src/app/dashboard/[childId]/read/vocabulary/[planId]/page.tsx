import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  vocabularyPlans,
  vocabularyWords,
  vocabularyProgress,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import { VocabularyLearningClient } from "./client";

function getCurrentPlanDay(weekStartDate: string): {
  weekNumber: number;
  day: number;
} {
  const start = new Date(weekStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { weekNumber: 1, day: 1 };
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const day = (diffDays % 7) + 1;
  return { weekNumber, day };
}

export default async function VocabularyLearningPage({
  params,
}: {
  params: Promise<{ childId: string; planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId, planId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(
      and(
        eq(vocabularyPlans.id, planId),
        eq(vocabularyPlans.childId, childId)
      )
    );

  if (!plan || plan.status !== "active") {
    redirect(`/dashboard/${childId}/read`);
  }

  const words = await db
    .select()
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  const progress = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        eq(vocabularyProgress.childId, childId)
      )
    );

  const current = getCurrentPlanDay(plan.weekStartDate);

  const voiceMap: Record<string, string> = {
    vi: "English_CaptivatingStoryteller",
    en: "English_CaptivatingStoryteller",
    de: "English_CaptivatingStoryteller",
  };
  const voice = voiceMap[child.nativeLanguage] || "English_CaptivatingStoryteller";

  return (
    <VocabularyLearningClient
      plan={plan}
      words={words}
      progress={progress}
      currentWeek={current.weekNumber}
      currentDay={current.day}
      childId={childId}
      childName={child.name}
      voice={voice}
      choiceCount={plan.plan.quizOptions.choiceCount}
      backHref={`/dashboard/${childId}/read`}
    />
  );
}
