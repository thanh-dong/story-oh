import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story } from "@/lib/types";

export function StoryCard({ story }: { story: Story }) {
  const gradient = getGradient(story.title);

  return (
    <Link href={`/story/${story.id}`} className="block">
      <Card className="h-full transition-all duration-200 hover:scale-[1.03] hover:shadow-xl">
        {/* Gradient cover placeholder */}
        <div
          className={`h-36 w-full bg-gradient-to-br ${gradient} flex items-center justify-center rounded-t-xl`}
        >
          <span className="text-5xl drop-shadow-md" aria-hidden="true">
            {getStoryEmoji(story.title)}
          </span>
        </div>

        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-bold leading-snug">
              {story.title}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {story.age_range}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {story.summary}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
