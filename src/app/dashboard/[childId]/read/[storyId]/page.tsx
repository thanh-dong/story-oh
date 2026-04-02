import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories, userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import { StoryReader } from "@/components/story-reader";
import type { Story } from "@/lib/types";

export default async function KidModeReaderPage({
  params,
}: {
  params: Promise<{ childId: string; storyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId, storyId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId));

  if (!story) redirect(`/dashboard/${childId}`);

  const [progress] = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        eq(userStories.child_id, childId)
      )
    );

  const initialProgress = progress?.progress ?? {
    current_node: "start",
    history: ["start"],
  };

  return (
    <StoryReader
      story={story as Story}
      initialProgress={initialProgress}
      userId={session.user.id}
      childId={childId}
      backHref={`/dashboard/${childId}/read`}
      moreStoriesHref={`/dashboard/${childId}/read`}
    />
  );
}
