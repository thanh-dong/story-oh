import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans, vocabularyWords } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { setCache } from "@/lib/tts-cache";

const VOICE_MAP: Record<string, string> = {
  vi: "Vietnamese_kindhearted_girl",
  en: "English_PlayfulGirl",
  de: "German_PlayfulMan",
};

// Max words per request — keeps within Vercel's 10s function timeout
const BATCH_SIZE = 3;

// GET — return audio status for the plan
export async function GET(
  _request: Request,
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

  const words = await db
    .select({
      id: vocabularyWords.id,
      word: vocabularyWords.word,
      audioUrl: vocabularyWords.audioUrl,
      audioGeneratedAt: vocabularyWords.audioGeneratedAt,
    })
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  const total = words.length;
  const ready = words.filter((w) => w.audioUrl).length;
  const missing = words.filter((w) => !w.audioUrl).map((w) => ({ id: w.id, word: w.word }));

  return NextResponse.json({ total, ready, missing });
}

// POST — regenerate audio for a small batch of words missing audio.
// Client should call repeatedly until remaining === 0.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd";

  if (!MINIMAX_API_KEY) {
    return NextResponse.json(
      { error: "TTS provider not configured" },
      { status: 500 }
    );
  }

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allMissing = await db
    .select()
    .from(vocabularyWords)
    .where(
      and(eq(vocabularyWords.planId, planId), isNull(vocabularyWords.audioUrl))
    );

  if (allMissing.length === 0) {
    return NextResponse.json({ regenerated: 0, failed: 0, remaining: 0 });
  }

  // Process only a small batch to stay within Vercel timeout
  const batch = allMissing.slice(0, BATCH_SIZE);
  const voice = VOICE_MAP[plan.nativeLanguage] || "Vietnamese_kindhearted_girl";
  const ttlMs = (plan.weeksRequested * 7 + 14) * 24 * 60 * 60 * 1000;

  let regenerated = 0;
  let failed = 0;

  for (const word of batch) {
    try {
      const ttsResponse = await fetch("https://api.minimax.io/v1/t2a_v2", {
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
        signal: AbortSignal.timeout(8000),
      });

      const json = await ttsResponse.json();

      if (!ttsResponse.ok || json.base_resp?.status_code !== 0) {
        console.error("[TTS] Regen error:", JSON.stringify(json));
        failed++;
        continue;
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

      regenerated++;
    } catch {
      failed++;
    }
  }

  // Update plan audio count
  const allWords = await db
    .select({ audioUrl: vocabularyWords.audioUrl })
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  const audioReady = allWords.filter((w) => w.audioUrl).length;
  await db
    .update(vocabularyPlans)
    .set({ wordsAudioReady: audioReady, updatedAt: new Date().toISOString() })
    .where(eq(vocabularyPlans.id, planId));

  const remaining = allMissing.length - regenerated;

  return NextResponse.json({ regenerated, failed, remaining });
}
