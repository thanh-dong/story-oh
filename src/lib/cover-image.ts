import { randomUUID } from "crypto";

const SUPABASE_BUCKET = "covers";

/**
 * Generate a children's story cover image via MiniMax and upload to Supabase Storage.
 * Returns the permanent public URL, or null on failure.
 */
export async function generateCoverImage(
  title: string,
  summary: string
): Promise<string | null> {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!MINIMAX_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[CoverImage] Missing env vars");
    return null;
  }

  // Build a child-safe cartoon prompt from the story content
  const prompt = buildPrompt(title, summary);

  try {
    // 1. Generate image via MiniMax
    const imageRes = await fetch("https://api.minimax.io/v1/image_generation", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        aspect_ratio: "16:9",
        response_format: "base64",
        n: 1,
        prompt_optimizer: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    const json = await imageRes.json();

    if (!imageRes.ok || json.base_resp?.status_code !== 0) {
      console.error("[CoverImage] MiniMax error:", JSON.stringify(json));
      return null;
    }

    const base64Data = json.data?.image_base64?.[0];
    if (!base64Data || typeof base64Data !== "string") {
      console.error("[CoverImage] No image data in response:", JSON.stringify(json).slice(0, 500));
      return null;
    }

    const imageBuffer = Buffer.from(base64Data, "base64");

    // 2. Ensure bucket exists (idempotent)
    await ensureBucket(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Upload to Supabase Storage
    const fileName = `${randomUUID()}.png`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "image/png",
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => "unknown");
      console.error("[CoverImage] Supabase upload failed:", err);
      return null;
    }

    // 4. Return permanent public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
  } catch (err) {
    console.error("[CoverImage] Failed:", err);
    return null;
  }
}

function buildPrompt(title: string, summary: string): string {
  // Take first 200 chars of summary to keep prompt concise
  const shortSummary = summary.length > 200 ? summary.slice(0, 200) + "..." : summary;

  return [
    "Children's book cover illustration in colorful cartoon style.",
    "Bright, warm, cheerful colors. Rounded friendly shapes.",
    "Safe and age-appropriate for children aged 4-12.",
    "No text or letters in the image.",
    `Story: "${title}" — ${shortSummary}`,
  ].join(" ");
}

let bucketEnsured = false;

async function ensureBucket(supabaseUrl: string, serviceKey: string): Promise<void> {
  if (bucketEnsured) return;

  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: SUPABASE_BUCKET,
      name: SUPABASE_BUCKET,
      public: true,
    }),
  }).catch(() => {});

  bucketEnsured = true;
}
