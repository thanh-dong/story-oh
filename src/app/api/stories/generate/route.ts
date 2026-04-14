import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, creditTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateGenerateRequest, generateStory } from "@/lib/story-generation";
import { estimateCost, calculateActualCost } from "@/lib/credits";
import { generateCoverImage } from "@/lib/cover-image";

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

  const validation = validateGenerateRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Calculate estimated cost
  const estimated = estimateCost({
    expectedReadingTime: validation.data.expectedReadingTime,
    maxBranches: validation.data.maxBranches,
    difficulty: validation.data.difficulty,
  });

  // Check credits
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
      { status: 402 }
    );
  }

  // Generate story
  const result = await generateStory(validation.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Calculate actual cost based on token usage
  const actualCost = calculateActualCost(estimated, result.data.completion_tokens);

  // Deduct credits atomically with guard against negative balance
  const deductResult = await db
    .update(user)
    .set({ credits: sql`${user.credits} - ${actualCost}` })
    .where(sql`${user.id} = ${session.user.id} AND ${user.credits} >= ${actualCost}`)
    .returning({ credits: user.credits });

  if (deductResult.length === 0) {
    // Race condition: credits were spent concurrently
    return NextResponse.json(
      { error: "Insufficient credits", credits: 0, estimated_cost: estimated },
      { status: 402 }
    );
  }

  const newBalance = deductResult[0].credits;

  // Record transaction
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

  // Generate cover image (non-blocking failure — story still works without cover)
  const coverImage = await generateCoverImage(result.data.title, result.data.summary);

  return NextResponse.json({
    title: result.data.title,
    summary: result.data.summary,
    age_range: result.data.age_range,
    story_tree: result.data.story_tree,
    cover_image: coverImage,
    credits_charged: actualCost,
    credits_remaining: newBalance,
  });
}
