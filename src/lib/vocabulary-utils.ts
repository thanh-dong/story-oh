export function getCurrentPlanDay(weekStartDate: string): {
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

/**
 * Check if a plan should transition to 'completed'.
 * Completes when all words have been quizzed.
 */
export async function checkPlanCompletion(
  planId: string,
  db: any
): Promise<boolean> {
  const { vocabularyWords, vocabularyProgress, vocabularyPlans } = await import("@/lib/db/schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");

  const allWords = await db
    .select({ id: vocabularyWords.id })
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  const quizzedWords = await db
    .select({ id: vocabularyProgress.id })
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        isNotNull(vocabularyProgress.quizzedAt)
      )
    );

  if (allWords.length > 0 && quizzedWords.length >= allWords.length) {
    await db
      .update(vocabularyPlans)
      .set({ status: "completed", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, planId));
    return true;
  }

  return false;
}
