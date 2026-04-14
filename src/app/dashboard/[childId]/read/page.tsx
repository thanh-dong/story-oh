import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories, vocabularyPlans } from "@/lib/db/schema";
import { and, eq, or, isNull, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Badge } from "@/components/ui/badge";
import { StoryCover } from "@/components/story-cover";
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

  // Fetch active or approved vocabulary plan
  const vocabRows = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId));

  const activePlan = vocabRows.find((p) => p.status === "active");
  const approvedPlan = vocabRows.find((p) => p.status === "approved");
  const vocabPlan = activePlan || approvedPlan;

  // Fetch all available stories: public + parent-created + explicitly assigned
  const assignedRows = await db
    .select({ storyId: childStories.storyId })
    .from(childStories)
    .where(eq(childStories.childId, childId));
  const assignedIds = assignedRows.map((r) => r.storyId);

  const conditions = [
    isNull(stories.created_by),
    eq(stories.created_by, session.user.id),
  ];
  if (assignedIds.length > 0) {
    conditions.push(inArray(stories.id, assignedIds));
  }

  const storyList = await db
    .select()
    .from(stories)
    .where(or(...conditions));

  const progressRows = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.child_id, childId)
      )
    );
  const progressMap = new Map(
    progressRows.map((r) => [r.story_id, r.progress])
  );

  const assignedStories = storyList.map((story) => ({
    story: story as Story,
    progress: progressMap.get(story.id) ?? null,
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
          <span className="text-6xl">{child.avatar}</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hi {child.name}!
            </h1>
            <Badge variant="secondary" className="mt-1">Age {age}</Badge>
          </div>
        </div>
      </div>

      {vocabPlan && (
        vocabPlan.status === "active" ? (
          <Link
            href={`/dashboard/${childId}/read/vocabulary/${vocabPlan.id}`}
            className="block animate-fade-up"
          >
            <div className="rounded-2xl bg-gradient-to-br from-kid-yellow to-kid-orange p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">📚</span>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Today&apos;s Words</h2>
                    <p className="text-sm text-white/80">
                      {vocabPlan.wordsTotal} words to learn
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-6 text-white/60" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="animate-fade-up rounded-2xl bg-gradient-to-br from-kid-yellow/60 to-kid-orange/60 p-5 storybook-shadow">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📚</span>
              <div>
                <h2 className="text-lg font-extrabold text-white">Words Coming Soon!</h2>
                <p className="text-sm text-white/80">
                  Your vocabulary plan is getting ready...
                </p>
              </div>
            </div>
          </div>
        )
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
            const isDone = progress && isAtEnding(story.story_tree, progress.current_node);
            const isReading = progress && !isDone;

            return (
              <Link
                key={story.id}
                href={`/dashboard/${childId}/read/${story.id}`}
                className="group block"
              >
                <article className="relative overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
                  <StoryCover
                    title={story.title}
                    coverImage={story.cover_image}
                    heightClass="h-28"
                    emojiClass="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110"
                  >
                    {isDone && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        &#x2713; Done
                      </Badge>
                    )}
                  </StoryCover>
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
