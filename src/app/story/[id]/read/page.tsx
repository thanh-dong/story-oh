import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StoryReader } from "@/components/story-reader";
import type { Story } from "@/lib/types";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch story first to check require_login
  let story: Story | null = null;
  if (supabase) {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("id", id)
      .single<Story>();
    story = data;
  }

  if (!story) notFound();

  // Get user if available
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  // Only require login if story has require_login set
  if (story.require_login && !user) {
    redirect(`/login?next=/story/${id}/read`);
  }

  // If logged in, manage progress
  let progress = { current_node: "start", history: ["start"] };
  if (user && supabase) {
    let { data: userStory } = await supabase
      .from("user_stories")
      .select("*")
      .eq("user_id", user.id)
      .eq("story_id", id)
      .single();

    if (!userStory) {
      const { data: newEntry } = await supabase
        .from("user_stories")
        .insert({ user_id: user.id, story_id: id })
        .select()
        .single();
      userStory = newEntry;
    }

    progress = userStory?.progress ?? progress;
  }

  return (
    <StoryReader
      story={story}
      initialProgress={progress}
      userId={user?.id ?? null}
    />
  );
}
