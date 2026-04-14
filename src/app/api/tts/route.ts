import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCached, setCache, cleanExpired } from "@/lib/tts-cache";

export async function POST(request: Request) {
  // Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required to use read-aloud" }, { status: 401 });
  }

  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || "speech-2.6-hd";

  if (!MINIMAX_API_KEY) {
    return NextResponse.json(
      { error: "TTS provider not configured" },
      { status: 500 }
    );
  }

  let body: { text: string; voice?: string; language_boost?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim() === "") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (body.text.length > 10000) {
    return NextResponse.json(
      { error: "Text too long (max 10000 characters)" },
      { status: 400 }
    );
  }

  const voice = body.voice ?? "English_CaptivatingStoryteller";
  const languageBoost = body.language_boost ?? "Vietnamese";

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

  // Generate via MiniMax Speech 2.6 HD
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
          text: body.text,
          stream: false,
          language_boost: languageBoost,
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

    if (!ttsResponse.ok) {
      console.error("[TTS] MiniMax error:", JSON.stringify(json));
      return NextResponse.json(
        { error: `TTS failed: ${json.base_resp?.status_msg ?? ttsResponse.status}` },
        { status: 500 }
      );
    }

    if (json.base_resp?.status_code !== 0) {
      return NextResponse.json(
        { error: `TTS error: ${json.base_resp?.status_msg ?? "unknown"}` },
        { status: 500 }
      );
    }

    // MiniMax returns hex-encoded audio
    const audioBuffer = Buffer.from(json.data.audio, "hex");

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
