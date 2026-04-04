import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories, vocabularyPlans } from "@/lib/db/schema";
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

  const [activePlan] = await db
    .select()
    .from(vocabularyPlans)
    .where(
      and(
        eq(vocabularyPlans.childId, childId),
        eq(vocabularyPlans.status, "active")
      )
    );

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

  // Sort: in-progress first, then not-started, then completed
  const sorted = assignedStories.sort((a, b) => {
    const statusOrder = (s: typeof a) => {
      if (s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)) return 0; // in progress
      if (!s.progress) return 1; // not started
      return 2; // completed
    };
    return statusOrder(a) - statusOrder(b);
  });

  return (
    <div className="space-y-8">
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

      {activePlan && (
        <Link
          href={`/dashboard/${childId}/read/vocabulary/${activePlan.id}`}
          className="block animate-fade-up"
        >
          <div className="rounded-2xl bg-gradient-to-br from-kid-yellow to-kid-orange p-5 storybook-shadow transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📚</span>
              <div>
                <h2 className="text-lg font-extrabold text-white">Today's Words</h2>
                <p className="text-sm text-white/80">
                  {activePlan.wordsTotal} words to learn
                </p>
              </div>
            </div>
          </div>
        </Link>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-xl font-bold">No stories yet!</p>
          <p className="text-muted-foreground">
            Ask your parent to pick some stories for you.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map(({ story, progress }) => {
            const gradient = getGradient(story.title);
            const emoji = getStoryEmoji(story.title);
            const isDone = progress && isAtEnding(story.story_tree, progress.current_node);
            const isReading = progress && !isDone;

            return (
              <Link
                key={story.id}
                href={`/dashboard/${childId}/read/${story.id}`}
                className="group block"
              >
                <article className="relative overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                  <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                    <span className="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                    {isDone && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        &#x2713; Done
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold">{story.title}</h3>
                    {isReading && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {progress!.history.length - 1} choices made
                      </p>
                    )}
                    {!isReading && !isDone && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{story.summary}</p>
                    )}
                    <span className={`mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${
                      isDone
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {isReading ? "Continue" : isDone ? "Read Again" : "Start Reading"}
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
