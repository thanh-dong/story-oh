import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const GUEST_COOKIE = "tt_guest_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") return "dev-only-not-for-production";
    throw new Error("BETTER_AUTH_SECRET env var is required");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function pack(uuid: string): string {
  return `${uuid}.${sign(uuid)}`;
}

export function verifyGuestId(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const uuid = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = sign(uuid);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return uuid;
}

export async function getOrCreateGuestId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  const verified = verifyGuestId(existing);
  if (verified) return verified;

  const uuid = randomUUID();
  jar.set(GUEST_COOKIE, pack(uuid), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return uuid;
}

export async function readGuestId(): Promise<string | null> {
  const jar = await cookies();
  return verifyGuestId(jar.get(GUEST_COOKIE)?.value);
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${getSecret()}`).digest("hex");
}
