import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { StoryCard } from "@/components/story-card";

export default async function ExplorePage() {
  const storyList = await db.select().from(storiesTable);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Explore Stories
        </h1>
        <p className="mt-2 text-muted-foreground">
          {storyList.length} {storyList.length === 1 ? "adventure" : "adventures"} waiting for you
        </p>
      </div>

      {storyList.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {storyList.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-muted-foreground">
            New adventures are being written. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
