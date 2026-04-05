import React from "react";
import Link from "next/link";
import { BookOpen, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";
import { StoryCard } from "@/components/story-card";

export default async function Home() {
  const storyList = await db
    .select()
    .from(storiesTable)
    .where(isNull(storiesTable.created_by))
    .orderBy(desc(storiesTable.created_at))
    .limit(3);

  return (
    <div className="space-y-16 pb-12 sm:space-y-20">
      {/* Hero */}
      <section className="relative flex flex-col items-center gap-6 pt-8 text-center sm:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-kid-purple/5 to-transparent" />
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
            <Button className="mt-2 rounded-full px-8 py-6 text-lg font-bold shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5">
              Start Exploring
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 sm:gap-6">
          <Step icon={<BookOpen className="size-6 text-primary sm:size-7" />} label="Pick a story" />
          <Arrow />
          <Step icon={<MessageCircleQuestion className="size-6 text-kid-orange sm:size-7" />} label="Make choices" />
          <Arrow />
          <Step icon={<Sparkles className="size-6 text-kid-pink sm:size-7" />} label="Discover endings" />
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

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-parchment shadow-card sm:size-16">
        {icon}
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
