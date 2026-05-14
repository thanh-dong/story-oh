"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Ornament } from "@/components/editorial";
import { cn } from "@/lib/utils";
import type { GuestDraftConfig } from "@/lib/db/schema";

type AgeBand = GuestDraftConfig["ageBand"];
type Length = GuestDraftConfig["length"];

interface IdeaStepProps {
  ageBand: AgeBand;
  length: Length;
  interests: string[];
  idea: string;
  lesson: string;
  onIdeaChange: (v: string) => void;
  onLessonChange: (v: string) => void;
  onBack: () => void;
  onEditStep: (step: 0 | 1) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}

const AGE_VISUAL: Record<AgeBand, { label: string; ornament: "leaf" | "sun" | "star"; color: string }> = {
  "4-6": { label: "Ages 4–6", ornament: "leaf", color: "var(--kid-yellow)" },
  "6-8": { label: "Ages 6–8", ornament: "sun", color: "var(--kid-orange)" },
  "8-12": { label: "Ages 8–12", ornament: "star", color: "var(--kid-pink)" },
};

const LENGTH_VISUAL: Record<Length, { label: string; sub: string; color: string; marks: number }> = {
  quick: { label: "Quick", sub: "~3 min", color: "var(--kid-green)", marks: 1 },
  standard: { label: "Standard", sub: "~5 min", color: "var(--kid-orange)", marks: 2 },
  longer: { label: "Longer", sub: "~10 min", color: "var(--kid-purple)", marks: 3 },
};

function buildIdeaPlaceholder(interests: string[]): string {
  if (interests.length === 0) {
    return "A small adventure your child would love to hear about…";
  }
  const top = interests.slice(0, 2).join(" and ").toLowerCase();
  return `A story about ${top}, where the hero learns something new…`;
}

function RecapRow({
  icon,
  iconBg,
  eyebrow,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  eyebrow: string;
  body: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-background px-3 py-2.5 text-left transition-all hover:border-foreground/10 hover:shadow-sm focus:outline-none focus-visible:border-foreground/20 focus-visible:shadow-sm"
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mono block text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </span>
        <span className="block">{body}</span>
      </span>
      <span className="mono flex-shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        Edit
      </span>
    </button>
  );
}

function RecapCard({
  ageBand,
  length,
  interests,
  onEditStep,
}: {
  ageBand: AgeBand;
  length: Length;
  interests: string[];
  onEditStep: (step: 0 | 1) => void;
}) {
  const age = AGE_VISUAL[ageBand];
  const len = LENGTH_VISUAL[length];

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your story so far
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <RecapRow
          onClick={() => onEditStep(0)}
          icon={<Ornament kind={age.ornament} size={14} color={age.color} />}
          iconBg={`color-mix(in oklab, ${age.color} 22%, transparent)`}
          eyebrow="Age"
          body={<span className="block truncate text-sm font-bold text-ink">{age.label}</span>}
        />
        <RecapRow
          onClick={() => onEditStep(0)}
          icon={
            <span className="flex items-end gap-[2px]">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block rounded-sm"
                  style={{
                    width: 3,
                    height: i <= len.marks ? 4 + i * 2 : 4,
                    background:
                      i <= len.marks
                        ? len.color
                        : "color-mix(in oklab, currentColor 18%, transparent)",
                  }}
                />
              ))}
            </span>
          }
          iconBg={`color-mix(in oklab, ${len.color} 22%, transparent)`}
          eyebrow="Length"
          body={
            <span className="block truncate text-sm font-bold text-ink">
              {len.label}
              <span className="ml-1.5 font-medium text-muted-foreground">· {len.sub}</span>
            </span>
          }
        />
      </div>

      <div className="mt-2">
        <RecapRow
          onClick={() => onEditStep(1)}
          icon={<Ornament kind="diamond" size={12} color="var(--kid-purple)" />}
          iconBg="color-mix(in oklab, var(--kid-purple) 22%, transparent)"
          eyebrow="Interests"
          body={
            interests.length === 0 ? (
              <span className="block text-sm font-medium italic text-muted-foreground">
                none picked
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {interests.slice(0, 6).map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: "color-mix(in oklab, var(--kid-purple) 16%, transparent)",
                      color: "var(--ink)",
                    }}
                  >
                    {i}
                  </span>
                ))}
                {interests.length > 6 && (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    +{interests.length - 6} more
                  </span>
                )}
              </span>
            )
          }
        />
      </div>
    </div>
  );
}

export function IdeaStep({
  ageBand,
  length,
  interests,
  idea,
  lesson,
  onIdeaChange,
  onLessonChange,
  onBack,
  onEditStep,
  onSubmit,
  submitting,
  error,
}: IdeaStepProps) {
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const ideaPlaceholder = useMemo(() => buildIdeaPlaceholder(interests), [interests]);

  async function handleMagic() {
    setMagicLoading(true);
    setMagicError(null);
    try {
      const res = await fetch("/api/v1/magic-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageBand,
          interests,
          idea: idea || undefined,
          lesson: lesson || undefined,
        }),
      });
      if (res.status === 429) {
        setMagicError("You've used all 3 magic suggestions for this story.");
        return;
      }
      if (!res.ok) {
        setMagicError("Magic failed. Try again.");
        return;
      }
      const data = await res.json();
      onIdeaChange(data.idea ?? idea);
      onLessonChange(data.lesson ?? lesson);
    } catch {
      setMagicError("Magic failed. Try again.");
    } finally {
      setMagicLoading(false);
    }
  }

  const canPreview = idea.trim().length > 0 && lesson.trim().length > 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="space-y-1">
        <h2
          className="display text-xl font-black text-ink sm:text-2xl"
          style={{ letterSpacing: "-0.015em" }}
        >
          The{" "}
          <em className="font-medium italic text-kid-purple">spark</em> of the story
        </h2>
        <p className="text-sm text-muted-foreground">
          Two short sentences are plenty — or let us suggest one.
        </p>
      </header>

      <RecapCard
        ageBand={ageBand}
        length={length}
        interests={interests}
        onEditStep={onEditStep}
      />

      <div className="space-y-2">
        <Label
          htmlFor="idea"
          className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]"
        >
          What is the story about?
        </Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => onIdeaChange(e.target.value)}
          placeholder={ideaPlaceholder}
          className="min-h-[100px] resize-none rounded-2xl border-2 bg-card text-[15px] leading-relaxed transition-colors focus-visible:border-kid-purple focus-visible:ring-0"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="lesson"
          className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]"
        >
          What lesson should they take away?
        </Label>
        <Textarea
          id="lesson"
          value={lesson}
          onChange={(e) => onLessonChange(e.target.value)}
          placeholder="Sharing makes adventures more fun…"
          className="min-h-[80px] resize-none rounded-2xl border-2 bg-card text-[15px] leading-relaxed transition-colors focus-visible:border-kid-pink focus-visible:ring-0"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleMagic}
          disabled={magicLoading || submitting}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-bold text-ink",
            "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
            "disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
          )}
          style={{
            borderColor: "var(--kid-yellow)",
            background: "color-mix(in oklab, var(--kid-yellow) 18%, transparent)",
          }}
        >
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-300",
              magicLoading ? "animate-pulse" : "group-hover:rotate-12",
            )}
            style={{ background: "color-mix(in oklab, var(--kid-yellow) 50%, transparent)" }}
          >
            <Ornament kind="star" size={11} color="var(--ink)" />
          </span>
          {magicLoading ? "Thinking…" : "Suggest for me"}
        </button>
        {magicError && (
          <p className="text-xs text-muted-foreground">{magicError}</p>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between sm:gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="w-full rounded-full px-6 py-5 text-base font-semibold sm:w-auto"
        >
          &larr; Back
        </Button>
        <Button
          disabled={!canPreview || submitting}
          onClick={onSubmit}
          className={cn(
            "w-full rounded-full px-8 py-5 text-base font-bold transition-transform sm:w-auto",
            !submitting && "hover:scale-[1.03] active:scale-100",
          )}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 animate-pulse rounded-full"
                style={{ background: "currentColor" }}
              />
              Generating your story…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Preview my story
              <Ornament kind="star" size={14} color="currentColor" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
