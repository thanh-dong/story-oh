import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateVocabularyPlan, countWordsInPlan } from "@/lib/vocabulary-generation";

export async function PATCH(
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
      { error: "Only draft plans can be edited" },
      { status: 400 }
    );
  }

  let body: { plan: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.plan || !validateVocabularyPlan(body.plan)) {
    return NextResponse.json(
      { error: "Invalid plan structure" },
      { status: 400 }
    );
  }

  const wordsTotal = countWordsInPlan(body.plan);

  const [updated] = await db
    .update(vocabularyPlans)
    .set({
      plan: body.plan,
      wordsTotal,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vocabularyPlans.id, planId))
    .returning();

  return NextResponse.json(updated);
}
