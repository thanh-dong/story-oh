import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateGenerateRequest, generateStory } from "@/lib/story-generation";
import { generateCoverImage } from "@/lib/cover-image";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateGenerateRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const result = await generateStory(validation.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const coverImage = await generateCoverImage(result.data.title, result.data.summary);

  return NextResponse.json({
    title: result.data.title,
    summary: result.data.summary,
    age_range: result.data.age_range,
    story_tree: result.data.story_tree,
    cover_image: coverImage,
  });
}
