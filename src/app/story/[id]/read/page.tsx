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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/story/${id}/read`);
  }

  // Fetch story
  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single<Story>();

  if (!story) notFound();

  // Fetch or create progress
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

  const progress = userStory?.progress ?? {
    current_node: "start",
    history: ["start"],
  };

  return (
    <StoryReader story={story} initialProgress={progress} userId={user.id} />
  );
}
