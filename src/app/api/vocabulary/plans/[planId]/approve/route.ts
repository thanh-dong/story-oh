import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  vocabularyPlans,
  vocabularyWords,
  user,
  creditTransactions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft plans can be approved" },
      { status: 400 }
    );
  }

  let insertedWords: Array<typeof vocabularyWords.$inferSelect>;

  try {
    insertedWords = await db.transaction(async (tx) => {
      const [currentUser] = await tx
        .select({ credits: user.credits })
        .from(user)
        .where(eq(user.id, session.user.id));

      if (currentUser.credits < plan.creditsCost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const newBalance = currentUser.credits - plan.creditsCost;
      await tx
        .update(user)
        .set({ credits: newBalance })
        .where(eq(user.id, session.user.id));

      await tx.insert(creditTransactions).values({
        user_id: session.user.id,
        amount: -plan.creditsCost,
        balance_after: newBalance,
        type: "vocabulary_plan",
        description: `Vocabulary plan (${plan.weeksRequested} week${plan.weeksRequested > 1 ? "s" : ""})`,
        metadata: { planId: plan.id, childId: plan.childId },
      });

      const wordRows: Array<{
        planId: string;
        word: string;
        topic: string;
        day: number;
        weekNumber: number;
        promptSentence: string;
        pronunciation: string;
        emoji: string;
      }> = [];

      for (const week of plan.plan.weeks) {
        for (const day of week.days) {
          for (const w of day.words) {
            wordRows.push({
              planId: plan.id,
              word: w.word,
              topic: day.topic,
              day: day.day,
              weekNumber: week.weekNumber,
              promptSentence: w.promptSentence,
              pronunciation: w.pronunciation,
              emoji: w.emoji,
            });
          }
        }
      }

      const words = await tx
        .insert(vocabularyWords)
        .values(wordRows)
        .returning();

      await tx
        .update(vocabularyPlans)
        .set({ status: "approved", updatedAt: new Date().toISOString() })
        .where(eq(vocabularyPlans.id, planId));

      return words;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }
    throw err;
  }

  // Activate immediately — audio is generated on-demand when child plays each word.
  // No background batch: Vercel serverless kills the function after response is sent.
  await db
    .update(vocabularyPlans)
    .set({ status: "active", updatedAt: new Date().toISOString() })
    .where(eq(vocabularyPlans.id, planId));

  return NextResponse.json({ ok: true, status: "active" });
}
