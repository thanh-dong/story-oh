import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story, StoryTree } from "@/lib/types";

function isAtEnding(storyTree: StoryTree, currentNode: string): boolean {
  const node = storyTree[currentNode];
  return node ? node.choices.length === 0 : false;
}

export default async function ChildReadingHubPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);

  const rows = await db
    .select()
    .from(childStories)
    .innerJoin(stories, eq(childStories.storyId, stories.id))
    .leftJoin(
      userStories,
      and(
        eq(userStories.story_id, childStories.storyId),
        eq(userStories.user_id, session.user.id),
        eq(userStories.child_id, childId)
      )
    )
    .where(eq(childStories.childId, childId));

  const assignedStories = rows.map((row) => ({
    story: row.stories as Story,
    progress: row.user_stories?.progress ?? null,
  }));

  const notStarted = assignedStories.filter((s) => !s.progress);
  const inProgress = assignedStories.filter(
    (s) => s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)
  );
  const completed = assignedStories.filter(
    (s) => s.progress && isAtEnding(s.story.story_tree, s.progress.current_node)
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{child.avatar}</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hi {child.name}!
            </h1>
            <Badge variant="secondary" className="mt-1">Age {age}</Badge>
          </div>
        </div>
      </div>

      {assignedStories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-xl font-bold">No stories yet!</p>
          <p className="text-muted-foreground">
            Ask your parent to pick some stories for you.
          </p>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Continue Reading</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {inProgress.map(({ story, progress }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="relative overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {progress!.history.length - 1} choices made
                          </p>
                          <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
                            Continue
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {notStarted.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Your Stories</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {notStarted.map(({ story }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{story.summary}</p>
                          <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
                            Start Reading
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Completed &#x2713;</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map(({ story }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md">{emoji}</span>
                          <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                            &#x2713; Done
                          </Badge>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <span className="mt-2 inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-bold text-muted-foreground">
                            Read Again
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
