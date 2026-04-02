import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { StoryCard } from "@/components/story-card";

export default async function Home() {
  const storyList = await db
    .select()
    .from(storiesTable)
    .orderBy(desc(storiesTable.created_at))
    .limit(3);

  return (
    <div className="space-y-16 pb-12 sm:space-y-20">
      {/* Hero */}
      <section className="relative flex flex-col items-center gap-6 pt-8 text-center sm:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute left-[8%] top-4 text-4xl opacity-20 sm:text-5xl">&#x2728;</span>
          <span className="absolute right-[10%] top-12 text-3xl opacity-15 sm:text-4xl">&#x1F31F;</span>
          <span className="absolute bottom-8 left-[15%] text-3xl opacity-15">&#x1F343;</span>
          <span className="absolute bottom-4 right-[12%] text-4xl opacity-20">&#x2B50;</span>
        </div>

        <div className="animate-fade-up">
          <span className="inline-block rounded-full bg-kid-yellow/20 px-4 py-1.5 text-sm font-semibold text-kid-orange">
            Interactive stories for ages 4&#x2013;12
          </span>
        </div>

        <h1 className="animate-fade-up text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl"
            style={{ animationDelay: "60ms" }}>
          Every Story Is{" "}
          <span className="text-primary">Your</span>{" "}
          Adventure
        </h1>

        <p className="max-w-lg animate-fade-up text-lg leading-relaxed text-muted-foreground sm:text-xl"
           style={{ animationDelay: "120ms" }}>
          Choose your path, shape the story, and discover gentle lessons along the way.
          Each choice leads to a different ending.
        </p>

        <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
          <Link href="/explore">
            <Button className="mt-2 rounded-full px-8 py-6 text-lg font-bold storybook-shadow transition-shadow hover:storybook-shadow-lg">
              Start Exploring
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 sm:gap-6">
          <Step emoji="&#x1F4D6;" label="Pick a story" />
          <Arrow />
          <Step emoji="&#x1F914;" label="Make choices" />
          <Arrow />
          <Step emoji="&#x2728;" label="Discover endings" />
        </div>
      </section>

      {/* Featured Stories */}
      {storyList.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Start Reading
              </h2>
              <p className="mt-1 text-muted-foreground">
                Jump into a story right now
              </p>
            </div>
            <Link href="/explore" className="text-sm font-semibold text-primary hover:underline">
              See all &rarr;
            </Link>
          </div>

          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {storyList.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Step({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-parchment storybook-shadow sm:size-16">
        <span className="text-2xl sm:text-3xl" dangerouslySetInnerHTML={{ __html: emoji }} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <div className="mb-6 text-muted-foreground/40" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  );
}
