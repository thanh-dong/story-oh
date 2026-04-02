import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable, userStories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story } from "@/lib/types";

export default async function LibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(userStories)
    .innerJoin(storiesTable, eq(userStories.story_id, storiesTable.id))
    .where(eq(userStories.user_id, session.user.id));

  const userStoryList = rows.map((row) => ({
    ...row.user_stories,
    story: row.stories as Story,
  }));

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          My Library
        </h1>
        <p className="mt-2 text-muted-foreground">
          {userStoryList.length > 0
            ? `${userStoryList.length} ${userStoryList.length === 1 ? "adventure" : "adventures"} in your collection`
            : "Your adventures await"}
        </p>
      </div>

      {userStoryList.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {userStoryList.map((us) => {
            const story = us.story;
            const gradient = getGradient(story.title);
            const emoji = getStoryEmoji(story.title);
            const choicesMade = us.progress?.history?.length ?? 0;
            const currentNode = story.story_tree?.[us.progress?.current_node ?? ""];
            const isAtEnding = currentNode && currentNode.choices.length === 0;

            return (
              <Link
                key={us.story_id}
                href={`/story/${story.id}/read`}
                className="group block"
              >
                <article className="relative h-full overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                  <div
                    className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradient} sm:h-40`}
                  >
                    <span className="text-5xl drop-shadow-md transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                      {emoji}
                    </span>
                    {isAtEnding && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-bold leading-snug tracking-tight">
                      {story.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {choicesMade} {choicesMade === 1 ? "choice" : "choices"} made
                    </p>
                    <div className="mt-3">
                      <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                        {isAtEnding ? "Read Again" : "Continue"}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-muted-foreground">
            Start exploring and add stories to your collection.
          </p>
          <Link href="/explore">
            <Button size="lg" className="mt-2 rounded-full px-8 font-bold">
              Explore Stories
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
