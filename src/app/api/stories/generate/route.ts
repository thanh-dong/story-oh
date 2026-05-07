import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, creditTransactions, generationSessions } from "@/lib/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { validateGenerateRequest, generateStory } from "@/lib/story-generation";
import { estimateCost, calculateActualCost } from "@/lib/credits";
import { generateCoverImage } from "@/lib/cover-image";

const FREE_REGENS = 2;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const session_id =
    typeof body === "object" && body !== null && "session_id" in body
      ? (body as { session_id?: unknown }).session_id
      : undefined;

  const validation = validateGenerateRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // ── Free regeneration path ──
  if (typeof session_id === "string" && session_id.length > 0) {
    const nowIso = new Date().toISOString();
    const decremented = await db
      .update(generationSessions)
      .set({ free_regens_remaining: sql`${generationSessions.free_regens_remaining} - 1` })
      .where(
        and(
          eq(generationSessions.id, session_id),
          eq(generationSessions.user_id, session.user.id),
          gt(generationSessions.free_regens_remaining, 0),
          gt(generationSessions.expires_at, nowIso),
        ),
      )
      .returning({ remaining: generationSessions.free_regens_remaining });

    if (decremented.length === 0) {
      return NextResponse.json(
        { error: "Regeneration session is invalid, expired, or exhausted", code: "regen_session_invalid" },
        { status: 400 },
      );
    }

    const result = await generateStory(validation.data);
    if (!result.ok) {
      // Refund the regen on generation failure so the user isn't punished.
      await db
        .update(generationSessions)
        .set({ free_regens_remaining: sql`${generationSessions.free_regens_remaining} + 1` })
        .where(eq(generationSessions.id, session_id));
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const coverImage = await generateCoverImage(result.data.title, result.data.summary);

    return NextResponse.json({
      title: result.data.title,
      summary: result.data.summary,
      age_range: result.data.age_range,
      story_tree: result.data.story_tree,
      cover_image: coverImage,
      session_id,
      free_regens_remaining: decremented[0].remaining,
    });
  }

  // ── Paid first generation path ──
  const estimated = estimateCost({
    expectedReadingTime: validation.data.expectedReadingTime,
    maxBranches: validation.data.maxBranches,
    difficulty: validation.data.difficulty,
  });

  const [currentUser] = await db
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!currentUser || currentUser.credits < estimated) {
    return NextResponse.json(
      {
        error: "Insufficient credits",
        credits: currentUser?.credits ?? 0,
        estimated_cost: estimated,
      },
      { status: 402 },
    );
  }

  const result = await generateStory(validation.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const actualCost = calculateActualCost(estimated, result.data.completion_tokens);

  const deductResult = await db
    .update(user)
    .set({ credits: sql`${user.credits} - ${actualCost}` })
    .where(sql`${user.id} = ${session.user.id} AND ${user.credits} >= ${actualCost}`)
    .returning({ credits: user.credits });

  if (deductResult.length === 0) {
    return NextResponse.json(
      { error: "Insufficient credits", credits: 0, estimated_cost: estimated },
      { status: 402 },
    );
  }

  const newBalance = deductResult[0].credits;

  await db.insert(creditTransactions).values({
    user_id: session.user.id,
    amount: -actualCost,
    balance_after: newBalance,
    type: "generation",
    description: `Generated story: ${validation.data.keyword}, ${validation.data.expectedReadingTime}min, ${validation.data.difficulty}`,
    metadata: {
      params: validation.data,
      completion_tokens: result.data.completion_tokens,
      estimated_cost: estimated,
      actual_cost: actualCost,
    },
  });

  const coverImage = await generateCoverImage(result.data.title, result.data.summary);

  // Issue a regen session granting FREE_REGENS free regenerations within TTL.
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const [created] = await db
    .insert(generationSessions)
    .values({
      user_id: session.user.id,
      free_regens_remaining: FREE_REGENS,
      expires_at: expiresAt,
    })
    .returning({ id: generationSessions.id, remaining: generationSessions.free_regens_remaining });

  return NextResponse.json({
    title: result.data.title,
    summary: result.data.summary,
    age_range: result.data.age_range,
    story_tree: result.data.story_tree,
    cover_image: coverImage,
    credits_charged: actualCost,
    credits_remaining: newBalance,
    session_id: created.id,
    free_regens_remaining: created.remaining,
  });
}
