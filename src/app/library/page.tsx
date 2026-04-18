import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable, userStories, children as childrenTable, childStories } from "@/lib/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import { BookCover, Pill, ShelfLabel } from "@/components/editorial";
import type { Story, Child, StoryTree } from "@/lib/types";

export const dynamic = "force-dynamic";
import { DeleteStoryButton } from "./delete-story-button";

const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"],
  ["#6E5FA8", "#3C2F6A"],
  ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"],
  ["#4D728F", "#1F3B52"],
  ["#8A5893", "#432948"],
];

function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

export default async function LibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const myStories = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.created_by, session.user.id));

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

  const userChildren = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.parentId, session.user.id)) as Child[];

  const assignmentMap: Record<string, string[]> = {};

  if (userChildren.length > 0) {
    const childIds = userChildren.map((c) => c.id);
    const assignments = await db
      .select()
      .from(childStories)
      .where(inArray(childStories.childId, childIds));

    for (const a of assignments) {
      if (!assignmentMap[a.storyId]) assignmentMap[a.storyId] = [];
      assignmentMap[a.storyId].push(a.childId);
    }
  }

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Your Collection
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h1
              className="display m-0 text-4xl font-black leading-[0.98] sm:text-[64px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              My <em className="font-medium italic text-primary">Library</em>.
            </h1>
            <Link href="/library/stories/new">
              <Button size="lg" className="rounded-full bg-primary px-6 text-base font-bold text-white">
                + New Story
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── My Stories ── */}
      <div className="px-4 pt-8 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <ShelfLabel roman="I" title="My Stories" sub={`${myStories.length} created`} />

          {myStories.length > 0 ? (
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {myStories.map((story) => {
                const tree = story.story_tree as StoryTree;
                const nodeCount = Object.keys(tree).length;
                const palette = getPalette(story.title);

                return (
                  <article
                    key={story.id}
                    className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card"
                  >
                    {userChildren.length > 0 && (
                      <div className="absolute right-3 top-3 z-10">
                        <ShareStoryDialog
                          storyId={story.id}
                          childrenList={userChildren}
                          assignedChildIds={assignmentMap[story.id] ?? []}
                        />
                      </div>
                    )}
                    <Link href={`/story/${story.id}`} className="block">
                      {story.cover_image ? (
                        <div className="relative h-[180px] w-full overflow-hidden">
                          <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                          <div className="absolute right-2.5 top-2.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
                            Ages {story.age_range}
                          </div>
                        </div>
                      ) : (
                        <BookCover title={story.title} palette={palette} tag={`Ages ${story.age_range}`} />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <Link href={`/story/${story.id}`}>
                        <h3 className="display text-[20px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                          {story.title}
                        </h3>
                      </Link>
                      <p className="mt-1 text-sm leading-normal text-muted-foreground line-clamp-1">
                        {story.summary}
                      </p>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {nodeCount} pages
                      </div>
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
              <p className="text-lg font-semibold">No stories yet</p>
              <p className="text-sm text-muted-foreground">Create your first story and share it with the world</p>
              <Link href="/library/stories/new">
                <Button className="mt-2 rounded-full px-6 font-bold">
                  + Create Story
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Reading Progress ── */}
      <div className="px-4 pb-16 pt-9 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <ShelfLabel roman="II" title="Reading Progress" sub="Continue your adventures" />

          {readingList.length > 0 ? (
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {readingList.map((us) => {
                const story = us.story;
                const choicesMade = us.progress?.history?.length ?? 0;
                const currentNode = story.story_tree?.[us.progress?.current_node ?? ""];
                const isAtEnding = currentNode && currentNode.choices.length === 0;
                const palette = getPalette(story.title);

                return (
                  <article
                    key={us.story_id}
                    className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
                  >
                    <Link href={`/story/${story.id}/read`} className="block">
                      {story.cover_image ? (
                        <div className="relative h-[180px] w-full overflow-hidden">
                          <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                          {isAtEnding && (
                            <div className="absolute right-2.5 top-2.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
                              Completed
                            </div>
                          )}
                        </div>
                      ) : (
                        <BookCover title={story.title} palette={palette} tag={isAtEnding ? "Completed" : undefined} />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2">
                        <Pill tone={isAtEnding ? "green" : "primary"}>
                          {isAtEnding ? "Completed" : `${choicesMade} choices made`}
                        </Pill>
                      </div>
                      <Link href={`/story/${story.id}/read`}>
                        <h3 className="display text-[20px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                          {story.title}
                        </h3>
                      </Link>
                      <div className="mt-auto pt-3">
                        <Link
                          href={`/story/${story.id}/read`}
                          className="text-[13px] font-bold text-primary"
                        >
                          {isAtEnding ? "Read Again" : "Continue"} &rarr;
                        </Link>
                      </div>
                    </div>

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
              <p className="text-lg font-semibold">No reading progress yet</p>
              <p className="text-sm text-muted-foreground">Start reading stories to track your progress</p>
              <Link href="/explore">
                <Button variant="outline" className="mt-2 rounded-full px-6 font-bold">
                  Explore Stories
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
