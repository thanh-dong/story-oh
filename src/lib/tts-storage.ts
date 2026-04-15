import { createHash } from "crypto";

const BUCKET = "tts-audio";

function getKey(text: string, voice: string): string {
  return createHash("sha256").update(`${voice}:${text}`).digest("hex") + ".mp3";
}

export function getPublicUrl(text: string, voice: string): string {
  const supabaseUrl = process.env.SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${getKey(text, voice)}`;
}

/** Returns the public URL if the audio exists in Supabase Storage, null otherwise. */
export async function getCachedUrl(
  text: string,
  voice: string
): Promise<string | null> {
  const url = getPublicUrl(text, voice);
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

/** Uploads audio to Supabase Storage and returns the permanent public URL. */
export async function storeAudio(
  text: string,
  voice: string,
  audio: Buffer
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const key = getKey(text, voice);

  await ensureBucket(supabaseUrl, serviceKey);

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${key}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
      },
      body: new Uint8Array(audio),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`[TTS Storage] Upload failed: ${res.status} ${err}`);
  }

  return getPublicUrl(text, voice);
}

let bucketEnsured = false;

async function ensureBucket(
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  if (bucketEnsured) return;

  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).catch(() => {});

  bucketEnsured = true;
}
