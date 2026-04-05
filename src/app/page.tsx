import React from "react";
import Link from "next/link";
import { BookOpen, MessageCircleQuestion, Sparkles, GraduationCap, ArrowRight, Star } from "lucide-react";
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
    <div className="pb-16">
      {/* ─── HERO ─── */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
        {/* Layered background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-kid-purple/[0.05] to-transparent" />
          <div className="absolute right-[10%] top-[10%] size-[500px] rounded-full bg-kid-yellow/[0.08] blur-[100px]" />
          <div className="absolute left-[5%] bottom-[20%] size-[400px] rounded-full bg-kid-purple/[0.08] blur-[80px]" />
          <div className="absolute right-[30%] bottom-[10%] size-[300px] rounded-full bg-kid-pink/[0.06] blur-[80px]" />
        </div>

        {/* Floating decorative elements */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-[8%] top-[15%] animate-float">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-kid-yellow/20 shadow-card rotate-12">
              <span className="text-2xl">📖</span>
            </div>
          </div>
          <div className="absolute right-[12%] top-[20%] animate-float-reverse" style={{ animationDelay: "1s" }}>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-kid-purple/20 shadow-card -rotate-6">
              <span className="text-xl">✨</span>
            </div>
          </div>
          <div className="absolute left-[15%] bottom-[25%] animate-float" style={{ animationDelay: "2s" }}>
            <div className="flex size-12 items-center justify-center rounded-xl bg-kid-green/20 shadow-card rotate-6">
              <span className="text-lg">🌟</span>
            </div>
          </div>
          <div className="absolute right-[8%] bottom-[30%] animate-float-reverse" style={{ animationDelay: "0.5s" }}>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-kid-pink/20 shadow-card -rotate-12">
              <span className="text-xl">🦋</span>
            </div>
          </div>
          <div className="hidden sm:block absolute left-[35%] top-[8%] animate-wiggle" style={{ animationDelay: "1.5s" }}>
            <div className="flex size-10 items-center justify-center rounded-xl bg-kid-orange/15 shadow-card">
              <span className="text-sm">🎨</span>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-kid-yellow/30 bg-kid-yellow/10 px-5 py-2 text-sm font-bold text-kid-orange shadow-card backdrop-blur-sm">
              <Star className="size-4 fill-kid-yellow text-kid-yellow" />
              Interactive stories for ages 4&#x2013;12
            </span>
          </div>

          <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ animationDelay: "60ms" }}>
            Stories That{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-primary to-kid-purple bg-clip-text text-transparent">Teach</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden="true">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/30" />
              </svg>
            </span>
            ,{" "}
            <br className="hidden sm:block" />
            Words That{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-kid-orange via-kid-pink to-kid-pink bg-clip-text text-transparent">Stick</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden="true">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-kid-pink/30" />
              </svg>
            </span>
          </h1>

          <p className="max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground sm:text-xl"
             style={{ animationDelay: "120ms" }}>
            Choose your path through interactive stories and build vocabulary
            with personalized AI learning — designed to make kids love reading.
          </p>

          <div className="flex animate-fade-up flex-col items-center gap-4 sm:flex-row" style={{ animationDelay: "180ms" }}>
            <Link href="/explore">
              <Button size="lg" className="group rounded-full px-10 py-7 text-lg font-bold shadow-elevated transition-all hover:-translate-y-1">
                Start Exploring
                <ArrowRight className="ml-1 size-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="rounded-full px-8 py-7 text-lg font-semibold shadow-card">
                Family Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative py-20 sm:py-28">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Learning made magical
          </h2>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <StepCard
            number="01"
            icon={<BookOpen className="size-8 text-primary" />}
            title="Pick a Story"
            description="Browse age-appropriate tales with gentle life lessons woven naturally into every adventure."
            accent="border-t-primary"
            iconBg="bg-primary/10"
          />
          <StepCard
            number="02"
            icon={<MessageCircleQuestion className="size-8 text-kid-orange" />}
            title="Make Choices"
            description="Every decision shapes the narrative — different paths lead to different endings and lessons."
            accent="border-t-kid-orange"
            iconBg="bg-kid-yellow/20"
          />
          <StepCard
            number="03"
            icon={<GraduationCap className="size-8 text-kid-purple" />}
            title="Learn Words"
            description="AI creates personalized vocabulary plans with listen-and-repeat practice in your language."
            accent="border-t-kid-purple"
            iconBg="bg-kid-purple/10"
          />
        </div>
      </section>

      {/* ─── FEATURED STORIES ─── */}
      {storyList.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="mb-2 inline-block rounded-full bg-kid-green/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-kid-green">
                Featured
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Start Reading Now
              </h2>
              <p className="mt-2 text-muted-foreground">
                Jump into an adventure — each story has multiple endings
              </p>
            </div>
            <Link href="/explore" className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5">
              See all
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storyList.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {/* ─── CTA BANNER ─── */}
      <section className="py-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary/90 to-kid-purple p-10 text-white shadow-elevated sm:p-16">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/[0.08] blur-2xl" />
            <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-kid-yellow/[0.15] blur-2xl" />
            <div className="absolute right-[20%] top-[20%] size-32 rounded-full bg-kid-pink/[0.1] blur-xl" />
          </div>

          {/* Floating shapes */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute right-8 top-8 animate-float opacity-40">
              <Star className="size-8 fill-white/20 text-white/30" />
            </div>
            <div className="absolute bottom-8 left-12 animate-float-reverse opacity-30" style={{ animationDelay: "1s" }}>
              <Sparkles className="size-6 text-kid-yellow/60" />
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-6 text-center">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Ready to start your family&apos;s<br className="hidden sm:block" /> learning journey?
            </h2>
            <p className="max-w-lg text-lg text-white/70">
              Create personalized reading and vocabulary plans for your children.
              Track progress and watch them grow.
            </p>
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="group rounded-full bg-white px-10 py-7 text-lg font-bold text-primary shadow-elevated transition-all hover:bg-white/95 hover:-translate-y-0.5">
                  Get Started Free
                  <ArrowRight className="ml-1 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <span className="text-sm text-white/50">No credit card required</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
  accent,
  iconBg,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  iconBg: string;
}) {
  return (
    <div className={`group relative flex flex-col gap-5 rounded-2xl border-t-4 ${accent} bg-card p-7 shadow-card transition-all duration-200 hover:-translate-y-2 hover:shadow-elevated`}>
      <span className="absolute right-5 top-4 text-5xl font-extrabold text-muted/60 select-none">
        {number}
      </span>
      <div className={`flex size-16 items-center justify-center rounded-2xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
