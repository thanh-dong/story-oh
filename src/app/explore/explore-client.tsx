"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookCover, Pill, ShelfLabel } from "@/components/editorial";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import type { Child, StoryTree } from "@/lib/types";

type Filter = "all" | "4-8" | "8-12";
type Sort = "newest" | "oldest";

interface StoryData {
  id: string;
  title: string;
  summary: string;
  age_range: string;
  cover_image: string | null;
  story_tree: unknown;
  created_at: string;
}

interface ExploreClientProps {
  stories: StoryData[];
  userChildren: Child[];
  assignmentMap: Record<string, string[]>;
}

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

const lessonKeywords = ["Courage", "Patience", "Kindness", "Wonder", "Honesty", "Curiosity", "Friendship", "Empathy"];
function getLesson(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return lessonKeywords[Math.abs(hash) % lessonKeywords.length];
}

export function ExploreClient({ stories, userChildren, assignmentMap }: ExploreClientProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const youngCount = stories.filter((s) => s.age_range === "4-8").length;
  const olderCount = stories.filter((s) => s.age_range === "8-12").length;

  const filtered = useMemo(() => {
    let list = stories;
    if (filter === "4-8") list = list.filter((s) => s.age_range === "4-8");
    if (filter === "8-12") list = list.filter((s) => s.age_range === "8-12");

    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
  }, [stories, filter, sort]);

  const youngStories = filtered.filter((s) => s.age_range === "4-8");
  const olderStories = filtered.filter((s) => s.age_range === "8-12");
  const otherStories = filtered.filter((s) => s.age_range !== "4-8" && s.age_range !== "8-12");

  const filters: { label: string; value: Filter; count: number }[] = [
    { label: "All", value: "all", count: stories.length },
    { label: "Ages 4–8", value: "4-8", count: youngCount },
    { label: "Ages 8–12", value: "8-12", count: olderCount },
  ];

  return (
    <>
      {/* Filter row */}
      <div className="mt-8 flex items-center justify-between border-y border-border py-3.5">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                filter === f.value
                  ? "border-ink bg-ink text-background"
                  : "border-border bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              <span className="text-[11px] opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
          className="hidden cursor-pointer items-center gap-3.5 text-xs text-muted-foreground sm:flex"
        >
          <span>Sort:</span>
          <span className="font-semibold text-ink">
            {sort === "newest" ? "Newest ↓" : "Oldest ↑"}
          </span>
        </button>
      </div>

      {/* Story shelves */}
      {filter === "all" ? (
        <>
          {youngStories.length > 0 && (
            <Shelf roman="I" title="Ages 4–8" sub="Simple stories with gentle lessons" stories={youngStories} userChildren={userChildren} assignmentMap={assignmentMap} />
          )}
          {olderStories.length > 0 && (
            <Shelf roman="II" title="Ages 8–12" sub="Richer stories with deeper choices" stories={olderStories} userChildren={userChildren} assignmentMap={assignmentMap} />
          )}
          {otherStories.length > 0 && (
            <Shelf roman="III" title="More Stories" sub="Additional adventures" stories={otherStories} userChildren={userChildren} assignmentMap={assignmentMap} />
          )}
        </>
      ) : (
        filtered.length > 0 ? (
          <div className="px-4 pb-16 pt-8 sm:px-10">
            <div className="mx-auto max-w-[1360px]">
              <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((story) => (
                  <StoryCardLg
                    key={story.id}
                    story={story}
                    childrenList={userChildren}
                    assignedChildIds={assignmentMap[story.id] ?? []}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-parchment py-24 text-center mx-4 sm:mx-10 mb-16 mt-8">
            <p className="text-xl font-bold">No stories in this category</p>
          </div>
        )
      )}

      {stories.length === 0 && (
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-parchment py-24 text-center mx-4 sm:mx-10 mb-16">
          <p className="text-xl font-bold">No stories yet</p>
          <p className="text-muted-foreground">New adventures are being written. Check back soon!</p>
        </div>
      )}
    </>
  );
}

function Shelf({
  roman,
  title,
  sub,
  stories,
  userChildren,
  assignmentMap,
}: {
  roman: string;
  title: string;
  sub: string;
  stories: StoryData[];
  userChildren: Child[];
  assignmentMap: Record<string, string[]>;
}) {
  return (
    <div className="px-4 pb-7 pt-8 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <ShelfLabel roman={roman} title={title} sub={sub} />
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCardLg
              key={story.id}
              story={story}
              childrenList={userChildren}
              assignedChildIds={assignmentMap[story.id] ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryCardLg({
  story,
  childrenList,
  assignedChildIds,
}: {
  story: StoryData;
  childrenList: Child[];
  assignedChildIds: string[];
}) {
  const palette = getPalette(story.title);
  const tree = story.story_tree as StoryTree;
  const nodeCount = Object.keys(tree).length;
  const endingCount = Object.values(tree).filter((n) => n.choices.length === 0).length;
  const lesson = getLesson(story.title);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
      {childrenList.length > 0 && (
        <div className="absolute left-3 top-3 z-10">
          <ShareStoryDialog
            storyId={story.id}
            childrenList={childrenList}
            assignedChildIds={assignedChildIds}
          />
        </div>
      )}
      <Link href={`/story/${story.id}`} className="block">
        {story.cover_image ? (
          <div className="relative h-[240px] w-full overflow-hidden rounded-t-[18px]">
            <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
            <div className="absolute right-2.5 top-2.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
              Ages {story.age_range}
            </div>
          </div>
        ) : (
          <BookCover title={story.title} palette={palette} tall tag={`Ages ${story.age_range}`} />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex gap-1.5">
          <Pill tone="purple">{lesson}</Pill>
        </div>
        <Link href={`/story/${story.id}`}>
          <h3 className="display text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            {story.title}
          </h3>
        </Link>
        <p className="mt-1.5 mb-3 flex-1 text-sm leading-normal text-muted-foreground line-clamp-2">
          {story.summary}
        </p>
        <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
          <div className="flex gap-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            <span>{nodeCount}p</span>
            <span className="opacity-40">&middot;</span>
            <span>{endingCount} endings</span>
          </div>
          <Link href={`/story/${story.id}`} className="text-[13px] font-bold text-primary">
            Open &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
