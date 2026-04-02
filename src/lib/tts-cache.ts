import { createHash } from "crypto";
import { readFile, writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), ".tts-cache");
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCacheKey(text: string, voice: string): string {
  return createHash("sha256").update(`${voice}:${text}`).digest("hex");
}

function getCachePath(key: string): string {
  return join(CACHE_DIR, `${key}.mp3`);
}

function getMetaPath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

export async function getCached(
  text: string,
  voice: string
): Promise<Buffer | null> {
  const key = getCacheKey(text, voice);
  const cachePath = getCachePath(key);
  const metaPath = getMetaPath(key);

  try {
    const metaRaw = await readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);

    // Check expiry
    if (Date.now() > meta.expiresAt) {
      // Expired — clean up
      await unlink(cachePath).catch(() => {});
      await unlink(metaPath).catch(() => {});
      return null;
    }

    return await readFile(cachePath);
  } catch {
    return null;
  }
}

export async function setCache(
  text: string,
  voice: string,
  audio: Buffer,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<void> {
  const key = getCacheKey(text, voice);
  const cachePath = getCachePath(key);
  const metaPath = getMetaPath(key);

  await mkdir(CACHE_DIR, { recursive: true });

  const meta = {
    text: text.slice(0, 100),
    voice,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    sizeBytes: audio.length,
  };

  await writeFile(cachePath, audio);
  await writeFile(metaPath, JSON.stringify(meta));
}

export async function cleanExpired(): Promise<{ removed: number; freedBytes: number }> {
  let removed = 0;
  let freedBytes = 0;

  try {
    const files = await readdir(CACHE_DIR);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const metaPath = join(CACHE_DIR, file);
      const audioPath = metaPath.replace(".json", ".mp3");

      try {
        const metaRaw = await readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaRaw);

        if (Date.now() > meta.expiresAt) {
          const audioStat = await stat(audioPath).catch(() => null);
          if (audioStat) freedBytes += audioStat.size;

          await unlink(audioPath).catch(() => {});
          await unlink(metaPath).catch(() => {});
          removed++;
        }
      } catch {
        // Corrupted meta — remove both files
        await unlink(audioPath).catch(() => {});
        await unlink(metaPath).catch(() => {});
        removed++;
      }
    }
  } catch {
    // Cache dir doesn't exist yet — nothing to clean
  }

  return { removed, freedBytes };
}
