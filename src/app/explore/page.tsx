import { createClient } from "@/lib/supabase/server";
import { StoryCard } from "@/components/story-card";
import type { Story } from "@/lib/types";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("*")
    .returns<Story[]>();

  return (
    <div>
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Explore Stories{" "}
        <span aria-hidden="true">{"\uD83E\uDDED"}</span>
      </h1>

      {stories && stories.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-5xl" aria-hidden="true">
            {"\uD83D\uDCDA"}
          </span>
          <p className="text-lg text-muted-foreground">
            No stories available yet. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
