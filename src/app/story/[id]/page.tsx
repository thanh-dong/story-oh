import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StoryTree } from "@/lib/types";

function countChoices(tree: StoryTree): number {
  let total = 0;
  for (const node of Object.values(tree)) {
    total += node.choices.length;
  }
  return total;
}

function countEndings(tree: StoryTree): number {
  let endings = 0;
  for (const node of Object.values(tree)) {
    if (node.choices.length === 0) endings++;
  }
  return endings;
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, id));

  if (!story) notFound();

  // Private stories only accessible by their creator
  if (story.created_by) {
    const session = await getSession();
    if (!session || session.user.id !== story.created_by) {
      notFound();
    }
  }

  const gradient = getGradient(story.title);
  const emoji = getStoryEmoji(story.title);
  const totalChoices = countChoices(story.story_tree);
  const totalEndings = countEndings(story.story_tree);
  const totalPages = Object.keys(story.story_tree).length;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up pb-12">
      {/* Gradient cover */}
      <div
        className={`relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} storybook-shadow sm:h-64`}
      >
        <span className="text-7xl drop-shadow-lg sm:text-8xl" aria-hidden="true">
          {emoji}
        </span>
      </div>

      {/* Story info */}
      <div className="mt-8 space-y-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {story.title}
          </h1>
          <Badge variant="secondary" className="mt-1.5 text-sm">
            Ages {story.age_range}
          </Badge>
        </div>

        <p className="text-lg leading-relaxed text-muted-foreground">
          {story.summary}
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 rounded-2xl bg-parchment p-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">&#x1F4D6;</span>
            <span>{totalPages} pages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">&#x1F500;</span>
            <span>{totalChoices} choices</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">&#x2728;</span>
            <span>{totalEndings} {totalEndings === 1 ? "ending" : "endings"}</span>
          </div>
        </div>

        <Link href={`/story/${story.id}/read`} className="block">
          <Button size="lg" className="w-full rounded-full py-6 text-lg font-bold storybook-shadow transition-shadow hover:storybook-shadow-lg">
            Start Reading
          </Button>
        </Link>
      </div>
    </div>
  );
}
