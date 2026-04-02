import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable, userStories, children as childrenTable, childStories } from "@/lib/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import type { Story, Child } from "@/lib/types";
import { DeleteStoryButton } from "./delete-story-button";

export default async function LibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // User's own stories
  const myStories = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.created_by, session.user.id));

  // Reading progress (stories user has been reading)
  const rows = await db
    .select()
    .from(userStories)
    .innerJoin(storiesTable, eq(userStories.story_id, storiesTable.id))
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        isNull(userStories.child_id)
      )
    );

  const readingList = rows.map((row) => ({
    ...row.user_stories,
    story: row.stories as Story,
  }));

  // Fetch children and build assignment map for share buttons
  const userChildren = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.parentId, session.user.id)) as Child[];

  let assignmentMap: Record<string, string[]> = {};

  if (userChildren.length > 0) {
    const childIds = userChildren.map((c) => c.id);
    const assignments = await db
      .select()
      .from(childStories)
      .where(inArray(childStories.childId, childIds));

    for (const a of assignments) {
      if (!assignmentMap[a.storyId]) {
        assignmentMap[a.storyId] = [];
      }
      assignmentMap[a.storyId].push(a.childId);
    }
  }

  return (
    <div className="space-y-12">
      {/* ── My Stories section ── */}
      <section className="space-y-6">
        <div className="flex items-end justify-between animate-fade-up">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Stories
            </h1>
            <p className="mt-1 text-muted-foreground">
              Stories you&apos;ve created
            </p>
          </div>
          <Link href="/library/stories/new">
            <Button className="rounded-full font-bold">
              <Plus className="size-4" data-icon="inline-start" />
              New Story
            </Button>
          </Link>
        </div>

        {myStories.length > 0 ? (
          <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myStories.map((story) => {
              const gradient = getGradient(story.title);
              const emoji = getStoryEmoji(story.title);
              const nodeCount = Object.keys(story.story_tree).length;

              return (
                <article
                  key={story.id}
                  className="group relative overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-0.5 hover:storybook-shadow-lg"
                >
                  <Link href={`/story/${story.id}`}>
                    <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                      <span className="text-4xl drop-shadow-md" aria-hidden="true">{emoji}</span>
                      <Badge className="absolute left-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        {story.age_range}
                      </Badge>
                    </div>
                  </Link>

                  {userChildren.length > 0 && (
                    <div className="absolute right-3 top-3 z-10">
                      <ShareStoryDialog
                        storyId={story.id}
                        childrenList={userChildren}
                        assignedChildIds={assignmentMap[story.id] ?? []}
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-bold leading-snug tracking-tight">{story.title}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{story.summary}</p>
                    <p className="mt-2 text-xs text-muted-foreground/70">{nodeCount} pages</p>

                    <div className="mt-3 flex items-center gap-2">
                      <Link href={`/library/stories/${story.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-lg text-xs font-semibold">
                          <Pencil className="size-3" data-icon="inline-start" />
                          Edit
                        </Button>
                      </Link>
                      <DeleteStoryButton storyId={story.id} storyTitle={story.title} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
            <span className="text-5xl" aria-hidden="true">&#x270D;&#xFE0F;</span>
            <p className="text-lg font-semibold">No stories yet</p>
            <p className="text-sm text-muted-foreground">Create your first story and share it with the world</p>
            <Link href="/library/stories/new">
              <Button className="mt-2 rounded-full px-6 font-bold">
                <Plus className="size-4" data-icon="inline-start" />
                Create Story
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ── Reading Progress section ── */}
      <section className="space-y-6">
        <div className="animate-fade-up">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Reading Progress
          </h2>
          <p className="mt-1 text-muted-foreground">
            Continue your adventures
          </p>
        </div>

        {readingList.length > 0 ? (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {readingList.map((us) => {
              const story = us.story;
              const gradient = getGradient(story.title);
              const emoji = getStoryEmoji(story.title);
              const choicesMade = us.progress?.history?.length ?? 0;
              const currentNode = story.story_tree?.[us.progress?.current_node ?? ""];
              const isAtEnding = currentNode && currentNode.choices.length === 0;

              return (
                <article
                  key={us.story_id}
                  className="group relative h-full overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg"
                >
                  <Link
                    href={`/story/${story.id}/read`}
                    className="block"
                  >
                    <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradient} sm:h-40`}>
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
                      <h3 className="text-lg font-bold leading-snug tracking-tight">{story.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {choicesMade} {choicesMade === 1 ? "choice" : "choices"} made
                      </p>
                      <div className="mt-3">
                        <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                          {isAtEnding ? "Read Again" : "Continue"}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {userChildren.length > 0 && (
                    <div className="absolute left-3 top-3 z-10">
                      <ShareStoryDialog
                        storyId={story.id}
                        childrenList={userChildren}
                        assignedChildIds={assignmentMap[story.id] ?? []}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
            <span className="text-5xl" aria-hidden="true">&#x1F4DA;</span>
            <p className="text-lg font-semibold">No reading progress yet</p>
            <p className="text-sm text-muted-foreground">Start reading stories to track your progress</p>
            <Link href="/explore">
              <Button variant="outline" className="mt-2 rounded-full px-6 font-bold">
                Explore Stories
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
