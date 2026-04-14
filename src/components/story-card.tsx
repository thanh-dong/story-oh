"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StoryCover } from "@/components/story-cover";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import type { Story, Child } from "@/lib/types";

interface StoryCardProps {
  story: Story;
  childrenList?: Child[];
  assignedChildIds?: string[];
}

export function StoryCard({ story, childrenList, assignedChildIds }: StoryCardProps) {
  const nodeCount = Object.keys(story.story_tree).length;
  const endingCount = Object.values(story.story_tree).filter(
    (n) => n.choices.length === 0
  ).length;

  return (
    <article className="group relative h-full overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
      <Link href={`/story/${story.id}`} className="block">
        <StoryCover
          title={story.title}
          coverImage={story.cover_image}
          heightClass="h-40 sm:h-44"
          emojiClass="text-5xl drop-shadow-md transition-transform duration-300 group-hover:scale-110 sm:text-6xl"
        >
          <Badge className="absolute right-3 top-3 bg-white/25 text-white backdrop-blur-sm border-0 text-xs font-bold">
            {story.age_range}
          </Badge>
        </StoryCover>

        {/* Content */}
        <div className="space-y-2 p-4 sm:p-5">
          <h3 className="text-lg font-bold leading-snug tracking-tight">
            {story.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {story.summary}
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs font-medium text-muted-foreground/70">
            <span>{nodeCount} pages</span>
            <span aria-hidden="true">&middot;</span>
            <span>{endingCount} {endingCount === 1 ? "ending" : "endings"}</span>
          </div>
        </div>
      </Link>

      {childrenList && childrenList.length > 0 && (
        <div className="absolute left-3 top-3 z-10">
          <ShareStoryDialog
            storyId={story.id}
            childrenList={childrenList}
            assignedChildIds={assignedChildIds ?? []}
          />
        </div>
      )}
    </article>
  );
}
