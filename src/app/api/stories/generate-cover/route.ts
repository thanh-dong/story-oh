import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateCoverImage } from "@/lib/cover-image";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title: string; summary: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title || !body.summary) {
    return NextResponse.json(
      { error: "title and summary are required" },
      { status: 400 }
    );
  }

  const coverImage = await generateCoverImage(body.title, body.summary);

  if (!coverImage) {
    return NextResponse.json(
      { error: "Failed to generate cover image" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cover_image: coverImage });
}
