import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";
import { BookCover, Ornament, Stamp, CornerFold } from "@/components/editorial";
import type { StoryTree } from "@/lib/types";

export const dynamic = "force-dynamic";

// Palette lookup for book covers based on title hash
const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"],
  ["#6E5FA8", "#3C2F6A"],
  ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"],
  ["#4D728F", "#1F3B52"],
  ["#8A5893", "#432948"],
];

function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

export default async function Home() {
  const storyList = await db
    .select()
    .from(storiesTable)
    .where(isNull(storiesTable.created_by))
    .orderBy(desc(storiesTable.created_at))
    .limit(3);

  return (
    <div className="bg-background text-foreground">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-[72px] sm:px-10">
        {/* Parchment wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 85% 10%, oklch(0.87 0.16 85 / 0.18), transparent 40%), radial-gradient(circle at 10% 90%, oklch(0.65 0.18 290 / 0.12), transparent 40%)",
          }}
        />

        {/* Editorial eyebrow */}
        <div className="relative mb-[18px] flex items-center gap-2.5">
          <div className="h-px w-10 bg-ink" />
          <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
            Volume Four &middot; Ages 4&mdash;12
          </span>
        </div>

        <div className="relative mx-auto grid max-w-[1360px] items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
          {/* Headline */}
          <div>
            <h1
              className="display m-0 text-5xl font-black leading-[0.95] text-ink sm:text-7xl lg:text-[92px]"
              style={{ letterSpacing: "-0.035em" }}
            >
              Stories that{" "}
              <em className="font-medium italic text-primary">
                teach
              </em>
              ,
              <br />
              words that{" "}
              <em className="font-medium italic text-kid-orange">
                stick
              </em>
              .
            </h1>
            <p className="mt-7 max-w-[440px] text-[17px] leading-relaxed text-muted-foreground">
              Choose-your-own adventures with gentle life lessons, paired with
              personalized vocabulary plans in your home language.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold text-white"
              >
                <Ornament kind="star" size={14} color="#fff" />
                Start exploring
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border-[1.5px] border-ink px-6 py-4 text-base font-bold text-ink"
              >
                Family dashboard
              </Link>
            </div>
            <div className="mt-7 flex gap-5 text-xs font-medium text-muted-foreground">
              <span>&check; 42 adventures</span>
              <span>&check; 8 languages</span>
              <span>&check; No ads, ever</span>
            </div>
          </div>

          {/* Stacked books composition */}
          <div className="relative hidden h-[420px] lg:block">
            <div className="absolute right-5 top-5 w-[210px] rotate-6">
              <BookCover title="The Lantern Keeper" palette={["#D98A5B", "#8E3A2B"]} tall tag="Ages 8-12" />
            </div>
            <div className="absolute right-[130px] top-20 w-[210px] -rotate-[4deg]">
              <BookCover title="A Sparrow's Plan" palette={["#6E5FA8", "#3C2F6A"]} tall tag="Ages 4-8" />
            </div>
            <div className="absolute right-[60px] top-[180px] w-[210px] rotate-2">
              <BookCover title="Tide & Current" palette={["#4D8F78", "#1F4F3F"]} tall tag="Ages 8-12" />
            </div>
            <div className="absolute left-2.5 top-2.5">
              <Ornament kind="sun" size={28} color="var(--kid-yellow)" />
            </div>
            <div className="absolute bottom-[30px] left-10">
              <Ornament kind="diamond" size={20} color="var(--kid-pink)" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="grain relative bg-parchment px-4 py-16 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-10 flex items-baseline justify-between">
            <div>
              <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Chapter I &mdash; How it works
              </span>
              <h2
                className="display mt-2.5 text-3xl font-black text-ink sm:text-[44px]"
                style={{ letterSpacing: "-0.02em" }}
              >
                A simple, thoughtful loop.
              </h2>
            </div>
            <div className="hidden h-px w-[120px] bg-ink/20 sm:block" />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {([
              { n: 1, title: "Pick a story", body: "Browse age-appropriate tales with gentle life lessons woven into every adventure.", tone: "primary" as const },
              { n: 2, title: "Make choices", body: "Every decision shapes the narrative — different paths lead to different endings.", tone: "orange" as const },
              { n: 3, title: "Learn words", body: "AI builds a personalized vocabulary plan with listen-and-repeat practice.", tone: "purple" as const },
            ]).map((s) => (
              <div
                key={s.n}
                className="relative min-h-[220px] rounded-2xl border border-border bg-card p-7"
              >
                <CornerFold />
                <div className="mb-5 flex items-center gap-3.5">
                  <Stamp n={s.n} tone={s.tone} />
                  <div className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Step {s.n}
                  </div>
                </div>
                <h3 className="display text-2xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED STORIES ─── */}
      {storyList.length > 0 && (
        <section className="px-4 py-16 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <div className="mb-7 flex items-baseline justify-between">
              <div>
                <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Chapter II &mdash; Featured
                </span>
                <h2
                  className="display mt-2.5 text-3xl font-black sm:text-[44px]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  This week&rsquo;s shelf.
                </h2>
              </div>
              <Link
                href="/explore"
                className="text-sm font-bold text-foreground hover:text-primary"
              >
                See all &rarr;
              </Link>
            </div>

            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {storyList.map((story) => {
                const palette = getPalette(story.title);
                const tree = story.story_tree as StoryTree;
                const nodeCount = Object.keys(tree).length;
                const endingCount = Object.values(tree).filter((n) => n.choices.length === 0).length;

                return (
                  <Link
                    key={story.id}
                    href={`/story/${story.id}`}
                    className="group overflow-hidden rounded-[18px] border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
                  >
                    <BookCover title={story.title} palette={palette} tall tag={`Ages ${story.age_range}`} />
                    <div className="p-5">
                      <h3 className="display text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                        {story.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-normal text-muted-foreground line-clamp-2">
                        {story.summary}
                      </p>
                      <div className="mt-3.5 flex items-center justify-between">
                        <div className="flex gap-3.5 text-xs font-medium text-muted-foreground">
                          <span>{nodeCount} pages</span>
                          <span className="opacity-40">&middot;</span>
                          <span>{endingCount} {endingCount === 1 ? "ending" : "endings"}</span>
                        </div>
                        <span className="text-[13px] font-bold text-primary">
                          Read &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA BANNER ─── */}
      <section className="px-4 pb-16 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-white sm:p-14">
            {/* decorative edge */}
            <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/15" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-kid-yellow">
                  Epilogue
                </span>
                <h2
                  className="display mt-3.5 text-4xl font-black leading-none sm:text-[56px]"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  Ready to start your family&rsquo;s
                  <br />
                  <em className="font-medium text-kid-yellow" style={{ fontStyle: "italic" }}>
                    learning journey?
                  </em>
                </h2>
                <p className="mt-[18px] max-w-[460px] text-base text-white/70">
                  Create personalized reading and vocabulary plans for each child. Track
                  progress — watch them grow.
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex rounded-full bg-white px-6 py-4 text-base font-bold text-ink"
                  >
                    Get started &mdash; free
                  </Link>
                  <span className="text-[13px] text-white/50">No credit card required</span>
                </div>
              </div>

              <div className="relative hidden h-[200px] text-right lg:block">
                <div
                  className="display text-[180px] font-black italic leading-[0.8] text-white/[0.06]"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  Fin.
                </div>
                <div className="absolute right-0 top-5 flex gap-2">
                  <Ornament kind="star" size={18} color="var(--kid-yellow)" />
                  <Ornament kind="diamond" size={14} color="var(--kid-pink)" />
                  <Ornament kind="sun" size={18} color="var(--kid-orange)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
