import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Story } from "@/lib/types";

const gradients = [
  "from-purple-400 to-pink-400",
  "from-blue-400 to-cyan-400",
  "from-orange-400 to-yellow-400",
  "from-green-400 to-teal-400",
  "from-red-400 to-orange-400",
  "from-indigo-400 to-purple-400",
  "from-pink-400 to-rose-400",
  "from-teal-400 to-emerald-400",
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

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
            {story.title.includes("Dragon")
              ? "\uD83D\uDC32"
              : story.title.includes("Ocean")
                ? "\uD83C\uDF0A"
                : story.title.includes("Space")
                  ? "\uD83D\uDE80"
                  : "\uD83D\uDCDA"}
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
