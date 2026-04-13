import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCached, setCache, cleanExpired } from "@/lib/tts-cache";

export async function POST(request: Request) {
  // Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required to use read-aloud" }, { status: 401 });
  }

  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;

  if (!AI_BASE_URL || !AI_API_KEY) {
    return NextResponse.json(
      { error: "AI provider not configured" },
      { status: 500 }
    );
  }

  let body: { text: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim() === "") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (body.text.length > 4000) {
    return NextResponse.json(
      { error: "Text too long (max 4000 characters)" },
      { status: 400 }
    );
  }

  const voice = body.voice ?? "nova";

  // Check cache first
  const cached = await getCached(body.text, voice);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Cache": "hit",
      },
    });
  }

  // Generate via OpenAI
  try {
    const ttsResponse = await fetch(`${AI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: body.text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!ttsResponse.ok) {
      return NextResponse.json(
        { error: `TTS failed: ${ttsResponse.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // Cache the result (non-blocking)
    setCache(body.text, voice, audioBuffer).catch(() => {});

    // Periodically clean expired cache (1% chance per request)
    if (Math.random() < 0.01) {
      cleanExpired().catch(() => {});
    }

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Cache": "miss",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "TTS request timed out"
        : "Failed to generate audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
