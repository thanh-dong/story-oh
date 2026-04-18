"use client";

import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { BookCover } from "@/components/editorial";
import type { StoryTree } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
});

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

interface Story {
  id: string;
  title: string;
  summary: string;
  cover_image: string | null;
  age_range: string;
  story_tree: StoryTree;
}

export function HomeFeatured() {
  const { data: storyList, isLoading } = useSWR<Story[]>("/api/stories/public?limit=3", fetcher);

  if (isLoading || !storyList || storyList.length === 0) {
    // Skeleton while loading
    return (
      <div className="grid animate-pulse gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-card">
            <div className="h-[240px] bg-muted" />
            <div className="p-5">
              <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
      {storyList.map((story) => {
        const palette = getPalette(story.title);
        const tree = story.story_tree;
        const nodeCount = Object.keys(tree).length;
        const endingCount = Object.values(tree).filter((n) => n.choices.length === 0).length;

        return (
          <Link
            key={story.id}
            href={`/story/${story.id}`}
            className="group overflow-hidden rounded-[18px] border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
          >
            {story.cover_image ? (
              <div className="relative h-[240px] w-full overflow-hidden">
                <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                <div className="absolute right-2.5 top-2.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
                  Ages {story.age_range}
                </div>
              </div>
            ) : (
              <BookCover title={story.title} palette={palette} tall tag={`Ages ${story.age_range}`} />
            )}
            <div className="p-5">
              <h3 className="display text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                {story.title}
              </h3>
              <p className="mt-1.5 text-sm leading-normal text-muted-foreground line-clamp-2">
                {story.summary}
              </p>
              <div className="mt-3.5 flex items-center justify-between">
                <div className="flex gap-3.5 text-xs font-medium text-muted-foreground">
                  <span>{nodeCount} pages</span>
                  <span className="opacity-40">&middot;</span>
                  <span>{endingCount} {endingCount === 1 ? "ending" : "endings"}</span>
                </div>
                <span className="text-[13px] font-bold text-primary">Read &rarr;</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
