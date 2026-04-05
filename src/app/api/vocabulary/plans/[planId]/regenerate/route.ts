import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans, user, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { estimateVocabularyCost } from "@/lib/vocabulary-credits";
import {
  generateVocabularyPlan,
  countWordsInPlan,
} from "@/lib/vocabulary-generation";

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
      { error: "Only draft plans can be regenerated" },
      { status: 400 }
    );
  }

  const regenTxns = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "vocabulary_plan_regen"));
  const regenCount = regenTxns.filter(
    (tx) => (tx.metadata as any)?.planId === planId
  ).length;

  if (regenCount >= 3) {
    await db
      .update(vocabularyPlans)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, planId));
    return NextResponse.json(
      { error: "Maximum regenerations (3) reached. Plan has been cancelled." },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(plan.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const age = calculateAge(child.dateOfBirth);
  const creditsCost = estimateVocabularyCost(plan.weeksRequested, age);

  const [currentUser] = await db
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (currentUser.credits < creditsCost) {
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 402 }
    );
  }

  const newBalance = currentUser.credits - creditsCost;
  await db
    .update(user)
    .set({ credits: newBalance })
    .where(eq(user.id, session.user.id));

  await db.insert(creditTransactions).values({
    user_id: session.user.id,
    amount: -creditsCost,
    balance_after: newBalance,
    type: "vocabulary_plan_regen",
    description: `Vocabulary plan regeneration`,
    metadata: { planId: plan.id },
  });

  const result = await generateVocabularyPlan({
    childName: child.name,
    childAge: age,
    interests: child.interests,
    nativeLanguage: child.nativeLanguage,
    learningLanguage: plan.learningLanguage,
    weeksRequested: plan.weeksRequested,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const wordsTotal = countWordsInPlan(result.data.plan);

  const [updated] = await db
    .update(vocabularyPlans)
    .set({
      plan: result.data.plan,
      wordsTotal,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vocabularyPlans.id, planId))
    .returning();

  return NextResponse.json(updated);
}
