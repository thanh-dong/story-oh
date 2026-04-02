import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, creditTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const body = await request.json();
  const amount = body.amount as number;
  const note = (body.note as string) || null;

  if (typeof amount !== "number" || amount === 0) {
    return NextResponse.json({ error: "amount must be a non-zero number" }, { status: 400 });
  }

  // For deductions, check the user has enough
  if (amount < 0) {
    const [target] = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, userId));

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.credits + amount < 0) {
      return NextResponse.json(
        { error: "Would result in negative balance", credits: target.credits },
        { status: 400 }
      );
    }
  }

  const [updated] = await db
    .update(user)
    .set({ credits: sql`${user.credits} + ${amount}` })
    .where(eq(user.id, userId))
    .returning({ credits: user.credits });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const type = amount > 0 ? "admin_grant" : "admin_deduct";

  const [transaction] = await db
    .insert(creditTransactions)
    .values({
      user_id: userId,
      amount,
      balance_after: updated.credits,
      type,
      description: note ?? `${type === "admin_grant" ? "Granted" : "Deducted"} by admin`,
      metadata: { admin_id: session.user.id, admin_email: session.user.email },
    })
    .returning();

  return NextResponse.json({ credits: updated.credits, transaction });
}
