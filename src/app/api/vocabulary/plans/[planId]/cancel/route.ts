import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans, user, creditTransactions } from "@/lib/db/schema";
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

  if (plan.status === "completed" || plan.status === "cancelled") {
    return NextResponse.json(
      { error: "Plan is already " + plan.status },
      { status: 400 }
    );
  }

  if (plan.status === "failed") {
    const [currentUser] = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, session.user.id));

    const newBalance = currentUser.credits + plan.creditsCost;
    await db
      .update(user)
      .set({ credits: newBalance })
      .where(eq(user.id, session.user.id));

    await db.insert(creditTransactions).values({
      user_id: session.user.id,
      amount: plan.creditsCost,
      balance_after: newBalance,
      type: "vocabulary_refund",
      description: "Vocabulary plan refund (generation failed)",
      metadata: { planId: plan.id },
    });
  }

  if (plan.status === "draft") {
    await db
      .delete(vocabularyPlans)
      .where(eq(vocabularyPlans.id, planId));
    return NextResponse.json({ ok: true, deleted: true });
  }

  await db
    .update(vocabularyPlans)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(eq(vocabularyPlans.id, planId));

  return NextResponse.json({ ok: true, refunded: plan.status === "failed" });
}
