import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Story, StoryTree } from "@/lib/types";

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
    if (node.choices.length === 0) {
      endings++;
    }
  }
  return endings;
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single<Story>();

  if (!story) notFound();

  const gradient = getGradient(story.title);
  const emoji = getStoryEmoji(story.title);
  const totalChoices = countChoices(story.story_tree);
  const totalEndings = countEndings(story.story_tree);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Gradient cover area */}
      <div
        className={`relative flex h-56 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} sm:h-64`}
      >
        <span className="text-7xl drop-shadow-lg" aria-hidden="true">
          {emoji}
        </span>
      </div>

      {/* Story info */}
      <div className="mt-8 space-y-6">
        {/* Title and age badge */}
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {story.title}
          </h1>
          <Badge variant="secondary" className="mt-1 text-sm">
            {story.age_range}
          </Badge>
        </div>

        {/* Full summary */}
        <p className="text-lg leading-relaxed text-muted-foreground">
          {story.summary}
        </p>

        {/* Story stats */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">{"\uD83D\uDD00"}</span>
            <span>
              {totalChoices} {totalChoices === 1 ? "choice" : "choices"} to make
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">{"\uD83C\uDFC1"}</span>
            <span>
              {totalEndings} possible{" "}
              {totalEndings === 1 ? "ending" : "endings"}
            </span>
          </div>
        </div>

        {/* Start Reading CTA */}
        <Link href={`/story/${story.id}/read`} className="block">
          <Button size="lg" className="w-full text-base font-bold py-6">
            Start Reading
          </Button>
        </Link>
      </div>
    </div>
  );
}
