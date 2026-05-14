import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  CONFIG_KEYS,
  getConfigNumber,
  setConfigNumber,
} from "@/lib/app-config";
import { DEFAULT_MAX_DRAFTS_PER_WINDOW } from "@/lib/v1-rate-limit";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const v1MaxDraftsPerWindow = await getConfigNumber(
    CONFIG_KEYS.v1MaxDraftsPerWindow,
    DEFAULT_MAX_DRAFTS_PER_WINDOW,
  );

  return NextResponse.json({
    v1MaxDraftsPerWindow,
    defaults: {
      v1MaxDraftsPerWindow: DEFAULT_MAX_DRAFTS_PER_WINDOW,
    },
  });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be a JSON object" },
      { status: 400 },
    );
  }

  const b = body as Record<string, unknown>;

  if (b.v1MaxDraftsPerWindow !== undefined) {
    if (
      typeof b.v1MaxDraftsPerWindow !== "number" ||
      !Number.isFinite(b.v1MaxDraftsPerWindow) ||
      b.v1MaxDraftsPerWindow < 0 ||
      b.v1MaxDraftsPerWindow > 100
    ) {
      return NextResponse.json(
        {
          error:
            "v1MaxDraftsPerWindow must be an integer between 0 and 100 (0 = unlimited)",
        },
        { status: 400 },
      );
    }
    await setConfigNumber(
      CONFIG_KEYS.v1MaxDraftsPerWindow,
      Math.floor(b.v1MaxDraftsPerWindow),
    );
  }

  const v1MaxDraftsPerWindow = await getConfigNumber(
    CONFIG_KEYS.v1MaxDraftsPerWindow,
    DEFAULT_MAX_DRAFTS_PER_WINDOW,
  );

  return NextResponse.json({ v1MaxDraftsPerWindow });
}
