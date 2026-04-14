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
import { setCache } from "@/lib/tts-cache";

const VOICE_MAP: Record<string, string> = {
  vi: "Vietnamese_kindhearted_girl",
  en: "English_PlayfulGirl",
  de: "German_PlayfulMan",
};

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

  generateAllAudio(plan, insertedWords).catch(console.error);

  return NextResponse.json({ ok: true, status: "approved" });
}

async function generateAllAudio(
  plan: typeof vocabularyPlans.$inferSelect,
  words: Array<typeof vocabularyWords.$inferSelect>
) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd";
  if (!MINIMAX_API_KEY) return;

  const voice = VOICE_MAP[plan.nativeLanguage] || "Vietnamese_kindhearted_girl";
  const ttlMs = (plan.weeksRequested * 7 + 14) * 24 * 60 * 60 * 1000;

  let audioReadyCount = 0;
  let failedCount = 0;

  for (const word of words) {
    let success = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ttsResponse = await fetch(
          "https://api.minimax.io/v1/t2a_v2",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${MINIMAX_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: MINIMAX_TTS_MODEL,
              text: word.promptSentence,
              stream: false,
              language_boost: "Vietnamese",
              voice_setting: {
                voice_id: voice,
                speed: 0.95,
                vol: 1.0,
                pitch: 0,
                emotion: "happy",
              },
              audio_setting: {
                sample_rate: 32000,
                bitrate: 128000,
                format: "mp3",
                channel: 1,
              },
            }),
            signal: AbortSignal.timeout(30000),
          }
        );

        const json = await ttsResponse.json();

        if (!ttsResponse.ok || json.base_resp?.status_code !== 0) {
          console.error("[TTS] Vocab audio error:", JSON.stringify(json));
          if (attempt < 2) {
            await new Promise((r) =>
              setTimeout(r, 1000 * Math.pow(2, attempt))
            );
            continue;
          }
          break;
        }

        const audioBuffer = Buffer.from(json.data.audio, "hex");
        await setCache(word.promptSentence, voice, audioBuffer, ttlMs);

        const { createHash } = await import("crypto");
        const cacheKey = createHash("sha256")
          .update(`${voice}:${word.promptSentence}`)
          .digest("hex");
        await db
          .update(vocabularyWords)
          .set({
            audioUrl: cacheKey,
            audioGeneratedAt: new Date().toISOString(),
          })
          .where(eq(vocabularyWords.id, word.id));

        audioReadyCount++;
        success = true;
        break;
      } catch {
        if (attempt < 2) {
          await new Promise((r) =>
            setTimeout(r, 1000 * Math.pow(2, attempt))
          );
        }
      }
    }

    if (!success) failedCount++;

    await db
      .update(vocabularyPlans)
      .set({
        wordsAudioReady: audioReadyCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vocabularyPlans.id, plan.id));
  }

  if (failedCount === words.length) {
    await db
      .update(vocabularyPlans)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, plan.id));
  } else {
    await db
      .update(vocabularyPlans)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, plan.id));
  }
}
