import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  // Cap text length to prevent abuse (roughly 2 minutes of speech)
  if (body.text.length > 4000) {
    return NextResponse.json(
      { error: "Text too long (max 4000 characters)" },
      { status: 400 }
    );
  }

  const voice = body.voice ?? "nova"; // nova is warm and friendly — good for kids

  try {
    const ttsResponse = await fetch(`${AI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: body.text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!ttsResponse.ok) {
      const text = await ttsResponse.text().catch(() => "unknown error");
      return NextResponse.json(
        { error: `TTS failed: ${ttsResponse.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400", // cache 24h
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
