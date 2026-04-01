import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story } from "@/lib/types";

interface UserStoryRow {
  user_id: string;
  story_id: string;
  progress: {
    current_node: string;
    history: string[];
  };
  story: Story;
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userStories } = await supabase
    .from("user_stories")
    .select("*, story:stories(*)")
    .eq("user_id", user.id)
    .returns<UserStoryRow[]>();

  const stories = userStories ?? [];

  return (
    <div>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        My Library <span aria-hidden="true">{"\uD83D\uDCDA"}</span>
      </h1>
      <p className="mb-8 text-muted-foreground">Your adventures await</p>

      {stories.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((us) => {
            const story = us.story;
            const gradient = getGradient(story.title);
            const emoji = getStoryEmoji(story.title);
            const choicesMade = us.progress.history.length;

            // Check if the user is at an ending node (no choices left)
            const currentNode = story.story_tree?.[us.progress.current_node];
            const isAtEnding =
              currentNode && currentNode.choices.length === 0;

            return (
              <Card key={us.story_id} className="flex flex-col">
                <div
                  className={`flex h-36 items-center justify-center bg-gradient-to-br ${gradient}`}
                >
                  <span className="text-5xl" aria-hidden="true">
                    {emoji}
                  </span>
                </div>

                <CardHeader>
                  <CardTitle>{story.title}</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {choicesMade} {choicesMade === 1 ? "choice" : "choices"}{" "}
                      made
                    </Badge>
                    {isAtEnding && (
                      <Badge variant="outline">Completed</Badge>
                    )}
                  </div>

                  <Link href={`/story/${story.id}/read`}>
                    <Button className="w-full">
                      {isAtEnding ? "Read Again" : "Continue Reading"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-5xl" aria-hidden="true">
            {"\uD83D\uDCDA"}{"\u2728"}
          </span>
          <p className="text-lg font-medium">No stories yet!</p>
          <p className="text-muted-foreground">
            Start exploring and add stories to your library.
          </p>
          <Link href="/explore">
            <Button size="lg">Explore Stories</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
