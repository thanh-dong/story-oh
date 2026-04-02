import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable, userStories } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { StoryReader } from "@/components/story-reader";
import type { Story } from "@/lib/types";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, id));

  if (!story) notFound();

  const session = await getSession();

  // Private stories only accessible by their creator
  if (story.created_by && (!session || session.user.id !== story.created_by)) {
    notFound();
  }

  if (story.require_login && !session) {
    redirect(`/login?next=/story/${id}/read`);
  }

  let progress = { current_node: "start", history: ["start"] };
  if (session) {
    const [existing] = await db
      .select()
      .from(userStories)
      .where(
        and(
          eq(userStories.user_id, session.user.id),
          eq(userStories.story_id, id),
          isNull(userStories.child_id)
        )
      );

    if (existing) {
      progress = existing.progress ?? progress;
    } else {
      await db.insert(userStories).values({
        user_id: session.user.id,
        story_id: id,
        child_id: null,
      });
    }
  }

  return (
    <StoryReader
      story={story as Story}
      initialProgress={progress}
      userId={session?.user.id ?? null}
    />
  );
}
