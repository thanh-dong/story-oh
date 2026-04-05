import React from "react";
import Link from "next/link";
import { BookOpen, MessageCircleQuestion, Sparkles, GraduationCap, ArrowRight } from "lucide-react";
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
    <div className="space-y-20 pb-16 sm:space-y-28">
      {/* Hero */}
      <section className="relative overflow-hidden pt-8 sm:pt-16">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-kid-purple/5 to-transparent" />
          <div className="absolute -right-32 -top-32 size-96 rounded-full bg-kid-yellow/10 blur-3xl" />
          <div className="absolute -left-32 top-32 size-80 rounded-full bg-kid-purple/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-kid-yellow/20 px-4 py-1.5 text-sm font-semibold text-kid-orange">
              <Sparkles className="size-3.5" />
              Interactive stories for ages 4&#x2013;12
            </span>
          </div>

          <h1 className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ animationDelay: "60ms" }}>
            Stories That{" "}
            <span className="bg-gradient-to-r from-primary to-kid-purple bg-clip-text text-transparent">Teach</span>,{" "}
            <br className="hidden sm:block" />
            Words That{" "}
            <span className="bg-gradient-to-r from-kid-orange to-kid-pink bg-clip-text text-transparent">Stick</span>
          </h1>

          <p className="max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground sm:text-xl"
             style={{ animationDelay: "120ms" }}>
            Choose your path through interactive stories and build vocabulary
            with personalized learning — all powered by AI, designed for kids.
          </p>

          <div className="flex animate-fade-up items-center gap-4" style={{ animationDelay: "180ms" }}>
            <Link href="/explore">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5">
                Start Exploring
                <ArrowRight className="ml-1 size-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="rounded-full px-6 py-6 text-lg font-semibold">
                Family Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">How It Works</h2>
          <p className="mt-2 text-muted-foreground">Three simple steps to start learning</p>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <StepCard
            icon={<BookOpen className="size-7 text-primary" />}
            title="Pick a Story"
            description="Browse age-appropriate tales with gentle life lessons woven in."
            color="bg-primary/10"
          />
          <StepCard
            icon={<MessageCircleQuestion className="size-7 text-kid-orange" />}
            title="Make Choices"
            description="Every decision shapes the story — different paths, different endings."
            color="bg-kid-yellow/20"
          />
          <StepCard
            icon={<GraduationCap className="size-7 text-kid-purple" />}
            title="Learn Words"
            description="AI creates personalized vocabulary plans with listen-and-repeat practice."
            color="bg-kid-purple/10"
          />
        </div>
      </section>

      {/* Featured Stories */}
      {storyList.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Start Reading
              </h2>
              <p className="mt-1 text-muted-foreground">
                Jump into a story right now
              </p>
            </div>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storyList.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-kid-purple p-8 text-center text-white shadow-elevated sm:p-12">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-kid-yellow/20 blur-2xl" />
          </div>
          <div className="relative space-y-4">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to start your family&apos;s learning journey?</h2>
            <p className="mx-auto max-w-lg text-white/80">
              Create personalized reading and vocabulary plans for your children. Track progress and watch them grow.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link href="/signup">
                <Button size="lg" className="rounded-full bg-white px-8 py-6 text-lg font-bold text-primary hover:bg-white/90 shadow-card">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
      <div className={`flex size-14 items-center justify-center rounded-2xl ${color}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
