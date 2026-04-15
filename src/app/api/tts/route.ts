import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCachedUrl, storeAudio } from "@/lib/tts-storage";

export async function POST(request: Request) {
  // Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required to use read-aloud" }, { status: 401 });
  }

  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd";

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

  const voice = body.voice ?? "Vietnamese_kindhearted_girl";
  const languageBoost = body.language_boost ?? "Vietnamese";

  // Check Supabase Storage cache first
  const cachedUrl = await getCachedUrl(body.text, voice);
  if (cachedUrl) {
    const audioRes = await fetch(cachedUrl);
    if (audioRes.ok) {
      return new Response(audioRes.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "X-TTS-Cache": "hit",
        },
      });
    }
  }

  // Generate via MiniMax TTS
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
      console.error("[TTS] MiniMax error:", JSON.stringify(json));
      return NextResponse.json(
        { error: `TTS error: ${json.base_resp?.status_msg ?? "unknown"}` },
        { status: 500 }
      );
    }

    // MiniMax returns hex-encoded audio
    const audioBuffer = Buffer.from(json.data.audio, "hex");

    // Store in Supabase Storage (non-blocking — don't delay the response)
    storeAudio(body.text, voice, audioBuffer).catch((err) =>
      console.error("[TTS] Store failed:", err)
    );

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
