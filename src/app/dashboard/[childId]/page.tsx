import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories, vocabularyPlans, vocabularyProgress } from "@/lib/db/schema";
import { and, eq, or, isNull, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoryCover } from "@/components/story-cover";
import type { Story, StoryTree } from "@/lib/types";
import { ArrowLeft, BookOpen, CheckCircle, Pencil, Play, Trash2 } from "lucide-react";

function isAtEnding(storyTree: StoryTree, currentNode: string): boolean {
  const node = storyTree[currentNode];
  return node ? node.choices.length === 0 : false;
}

export default async function ChildManagePage({
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

  // Fetch reading progress for this child
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

  // Fetch vocabulary plans for this child
  const vocabPlansRows = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId));

  const activePlan = vocabPlansRows.find(
    (p) => p.status === "active" || p.status === "approved"
  );
  const draftPlan = vocabPlansRows.find((p) => p.status === "draft");

  // Fetch learning progress for active plan
  let vocabWordsListened = 0;
  if (activePlan) {
    const progressRows = await db
      .select()
      .from(vocabularyProgress)
      .where(
        and(
          eq(vocabularyProgress.planId, activePlan.id),
          eq(vocabularyProgress.childId, childId),
          eq(vocabularyProgress.listened, true)
        )
      );
    vocabWordsListened = progressRows.length;
  }

  const completedCount = assignedStories.filter(
    (s) => s.progress && isAtEnding(s.story.story_tree, s.progress.current_node)
  ).length;
  const inProgressCount = assignedStories.filter(
    (s) => s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="lg"
            className="min-h-[44px] rounded-xl"
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft className="size-5" data-icon="inline-start" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{child.avatar}</span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {child.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">Age {age}</Badge>
                <Badge variant="secondary">{child.nativeLanguage.toUpperCase()}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] rounded-xl"
              render={<Link href={`/dashboard/${childId}/edit`} />}
            >
              <Pencil className="size-4" data-icon="inline-start" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Start Reader Mode CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Reader Mode</h2>
            <p className="mt-1 text-white/80">
              Hand the device to {child.name} — simplified UI, no navigation distractions
            </p>
          </div>
          <Link href={`/dashboard/${childId}/read`}>
            <Button
              size="lg"
              className="min-h-[56px] rounded-full bg-white px-8 text-lg font-bold text-purple-600 hover:bg-white/90"
            >
              <Play className="size-5" data-icon="inline-start" />
              Start Reading
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{assignedStories.length}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
          <div className="flex size-10 items-center justify-center rounded-lg bg-kid-yellow/20">
            <Play className="size-5 text-kid-orange" />
          </div>
          <div>
            <p className="text-2xl font-bold">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
          <div className="flex size-10 items-center justify-center rounded-lg bg-kid-green/20">
            <CheckCircle className="size-5 text-kid-green" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* Assigned Stories */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Assigned Stories</h2>
          <Button
            variant="outline"
            className="rounded-xl"
            render={<Link href="/explore" />}
          >
            <BookOpen className="size-4" data-icon="inline-start" />
            Find Stories
          </Button>
        </div>

        {assignedStories.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
            <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
            <p className="text-lg font-bold">No stories assigned yet</p>
            <p className="text-muted-foreground">
              Go to Explore to find stories and share them with {child.name}
            </p>
            <Link href="/explore">
              <Button className="rounded-full px-6 font-bold">
                <BookOpen className="size-4" data-icon="inline-start" />
                Explore Stories
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignedStories.map(({ story, progress }) => {
              const isCompleted = progress && isAtEnding(story.story_tree, progress.current_node);
              const isInProgress = progress && !isCompleted;

              return (
                <article
                  key={story.id}
                  className="overflow-hidden rounded-2xl bg-card shadow-card"
                >
                  <StoryCover title={story.title} coverImage={story.cover_image} heightClass="h-28">
                    {isCompleted && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        &#x2713; Done
                      </Badge>
                    )}
                    {isInProgress && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        Reading
                      </Badge>
                    )}
                  </StoryCover>
                  <div className="p-4">
                    <h3 className="font-bold">{story.title}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{story.summary}</p>
                    {isInProgress && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {progress!.history.length - 1} choices made
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Vocabulary Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Vocabulary</h2>
          <Button
            variant="outline"
            className="rounded-xl"
            render={<Link href={`/dashboard/${childId}/vocabulary`} />}
          >
            {activePlan ? "Manage Plan" : draftPlan ? "Review Draft" : "Create Plan"}
          </Button>
        </div>
        {activePlan ? (
          <div className="rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Vocabulary Plan</h3>
              <span className="text-sm text-muted-foreground capitalize">{activePlan.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {activePlan.weeksRequested} week{activePlan.weeksRequested > 1 ? "s" : ""} · {vocabWordsListened}/{activePlan.wordsTotal} words learned
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-primary transition-all animate-progress-fill"
                style={{ width: `${activePlan.wordsTotal > 0 ? Math.round((vocabWordsListened / activePlan.wordsTotal) * 100) : 0}%` }}
              />
            </div>
            <Link
              href={`/dashboard/${childId}/vocabulary`}
              className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground"
            >
              Go to Vocabulary
            </Link>
          </div>
        ) : draftPlan ? (
          <Link href={`/dashboard/${childId}/vocabulary`} className="block">
            <div className="rounded-2xl bg-card p-6 shadow-card transition-all hover:-translate-y-1">
              <p className="font-bold mb-2">Draft plan ready for review</p>
              <p className="text-sm text-muted-foreground">Tap to review and approve the plan to start learning.</p>
            </div>
          </Link>
        ) : (
          <Link href={`/dashboard/${childId}/vocabulary`} className="block">
            <div className="rounded-2xl bg-muted p-6 text-center transition-all hover:-translate-y-1">
              <span className="text-4xl block mb-2">📖</span>
              <p className="font-bold">Create a Vocabulary Plan</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI-generated weekly learning for {child.name}
              </p>
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
