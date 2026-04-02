import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ credits: currentUser?.credits ?? 0 });
}
