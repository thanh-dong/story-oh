"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover, Pill, ShelfLabel } from "@/components/editorial";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import { DeleteStoryButton } from "./delete-story-button";
import type { Child, StoryTree } from "@/lib/types";

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

interface StoryItem {
  id: string;
  title: string;
  summary: string;
  coverImage: string | null;
  ageRange: string;
  storyTree: StoryTree;
}

interface ReadingItem extends StoryItem {
  storyId: string;
  choicesMade: number;
  isAtEnding: boolean;
}

interface LibraryData {
  myStories: StoryItem[];
  readingList: ReadingItem[];
  userChildren: Child[];
  assignmentMap: Record<string, string[]>;
}

export function LibraryClient() {
  const { data, error, isLoading } = useSWR<LibraryData>("/api/library", fetcher);
  const router = useRouter();

  useEffect(() => {
    if (error) router.push("/login");
  }, [error, router]);

  if (error || isLoading || !data) {
    return <LibrarySkeleton />;
  }

  const { myStories, readingList, userChildren, assignmentMap } = data;

  return (
    <>
      {/* My Stories */}
      <div className="px-4 pt-8 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <ShelfLabel roman="I" title="My Stories" sub={`${myStories.length} created`} />

          {myStories.length > 0 ? (
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {myStories.map((story) => {
                const tree = story.storyTree as StoryTree;
                const nodeCount = Object.keys(tree).length;
                const palette = getPalette(story.title);

                return (
                  <article key={story.id} className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
                    {userChildren.length > 0 && (
                      <div className="absolute right-3 top-3 z-10">
                        <ShareStoryDialog storyId={story.id} childrenList={userChildren} assignedChildIds={assignmentMap[story.id] ?? []} />
                      </div>
                    )}
                    <Link href={`/story/${story.id}`} className="block">
                      {story.coverImage ? (
                        <div className="relative h-[180px] w-full overflow-hidden">
                          <Image src={story.coverImage} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        </div>
                      ) : (
                        <BookCover title={story.title} palette={palette} tag={`Ages ${story.ageRange}`} />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <Link href={`/story/${story.id}`}>
                        <h3 className="display text-[20px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>{story.title}</h3>
                      </Link>
                      <p className="mt-1 text-sm leading-normal text-muted-foreground line-clamp-1">{story.summary}</p>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{nodeCount} pages</div>
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
                <Button className="mt-2 rounded-full px-6 font-bold">+ Create Story</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Reading Progress */}
      <div className="px-4 pb-16 pt-9 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <ShelfLabel roman="II" title="Reading Progress" sub="Continue your adventures" />

          {readingList.length > 0 ? (
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {readingList.map((item) => {
                const palette = getPalette(item.title);
                return (
                  <article key={item.id} className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated">
                    <Link href={`/story/${item.storyId}/read`} className="block">
                      {item.coverImage ? (
                        <div className="relative h-[180px] w-full overflow-hidden">
                          <Image src={item.coverImage} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        </div>
                      ) : (
                        <BookCover title={item.title} palette={palette} tag={item.isAtEnding ? "Completed" : undefined} />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2">
                        <Pill tone={item.isAtEnding ? "green" : "primary"}>
                          {item.isAtEnding ? "Completed" : `${item.choicesMade} choices made`}
                        </Pill>
                      </div>
                      <Link href={`/story/${item.storyId}/read`}>
                        <h3 className="display text-[20px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>{item.title}</h3>
                      </Link>
                      <div className="mt-auto pt-3">
                        <Link href={`/story/${item.storyId}/read`} className="text-[13px] font-bold text-primary">
                          {item.isAtEnding ? "Read Again" : "Continue"} &rarr;
                        </Link>
                      </div>
                    </div>
                    {userChildren.length > 0 && (
                      <div className="absolute left-3 top-3 z-10">
                        <ShareStoryDialog storyId={item.storyId} childrenList={userChildren} assignedChildIds={assignmentMap[item.storyId] ?? []} />
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
                <Button variant="outline" className="mt-2 rounded-full px-6 font-bold">Explore Stories</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LibrarySkeleton() {
  return (
    <div className="animate-pulse px-4 pt-8 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-5 h-6 w-32 rounded bg-muted" />
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-card">
              <div className="h-[180px] bg-muted" />
              <div className="p-5">
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
