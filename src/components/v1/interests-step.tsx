"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ornament } from "@/components/editorial";
import { cn } from "@/lib/utils";

type Tone = "yellow" | "orange" | "pink" | "green" | "purple";
type OrnamentKind = "star" | "leaf" | "diamond" | "sun";

const toneVar: Record<Tone, string> = {
  yellow: "var(--kid-yellow)",
  orange: "var(--kid-orange)",
  pink: "var(--kid-pink)",
  green: "var(--kid-green)",
  purple: "var(--kid-purple)",
};

interface PresetInterest {
  label: string;
  tone: Tone;
  ornament: OrnamentKind;
  hint: string;
}

const PRESET_INTERESTS: PresetInterest[] = [
  { label: "Cars", tone: "orange", ornament: "diamond", hint: "Speed & adventure" },
  { label: "Animals", tone: "green", ornament: "leaf", hint: "Furry friends" },
  { label: "Princess", tone: "pink", ornament: "star", hint: "Castles & quests" },
  { label: "Technology", tone: "purple", ornament: "sun", hint: "Robots & gadgets" },
  { label: "Music", tone: "yellow", ornament: "star", hint: "Songs & rhythm" },
  { label: "Fashion", tone: "pink", ornament: "diamond", hint: "Style & sparkle" },
];

interface InterestsStepProps {
  interests: string[];
  onInterestsChange: (v: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

function InterestCard({
  preset,
  selected,
  onToggle,
}: {
  preset: PresetInterest;
  selected: boolean;
  onToggle: () => void;
}) {
  const color = toneVar[preset.tone];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${preset.label}: ${preset.hint}`}
      className={cn(
        "group relative flex h-full flex-col items-start gap-2.5 rounded-2xl border-2 p-3 text-left sm:p-4",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]",
        selected ? "shadow-md" : "border-border bg-card hover:border-foreground/20",
      )}
      style={
        selected
          ? {
              borderColor: color,
              backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
            }
          : undefined
      }
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 sm:h-9 sm:w-9 sm:rounded-xl",
          selected && "scale-110",
        )}
        style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }}
      >
        <Ornament kind={preset.ornament} size={15} color={color} />
      </div>

      <div className="min-w-0 space-y-0.5">
        <div
          className="display truncate text-sm font-extrabold text-ink sm:text-base"
          style={{ letterSpacing: "-0.01em" }}
        >
          {preset.label}
        </div>
        <div className="mono hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
          {preset.hint}
        </div>
      </div>
    </button>
  );
}

export function InterestsStep({
  interests,
  onInterestsChange,
  onBack,
  onNext,
}: InterestsStepProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function togglePreset(label: string) {
    if (interests.includes(label)) {
      onInterestsChange(interests.filter((i) => i !== label));
    } else {
      onInterestsChange([...interests, label]);
    }
  }

  function addFromInput() {
    const parts = inputValue
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...interests];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onInterestsChange(next);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addFromInput();
    }
  }

  function removeInterest(label: string) {
    onInterestsChange(interests.filter((i) => i !== label));
  }

  const customInterests = interests.filter(
    (i) => !PRESET_INTERESTS.some((p) => p.label === i)
  );

  const canProceed = interests.length >= 1;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="space-y-1">
        <h2
          className="display text-xl font-black text-ink sm:text-2xl"
          style={{ letterSpacing: "-0.015em" }}
        >
          What does your child{" "}
          <em className="font-medium italic text-kid-pink">love</em>?
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap a few — we&rsquo;ll weave them into the story.
        </p>
      </header>

      <section className="space-y-3">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
          Popular interests
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {PRESET_INTERESTS.map((p) => (
            <InterestCard
              key={p.label}
              preset={p}
              selected={interests.includes(p.label)}
              onToggle={() => togglePreset(p.label)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
          Anything else
        </p>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addFromInput}
            placeholder="Space, dinosaurs, painting…"
            className="rounded-xl border-2 pr-16 text-sm transition-colors focus-visible:border-kid-purple focus-visible:ring-0 sm:pr-20"
          />
          <span className="mono pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:inline-block">
            Enter ↵
          </span>
        </div>

        {customInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customInterests.map((i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold",
                  "transition-all duration-200 ease-out animate-in fade-in zoom-in-95",
                )}
                style={{
                  borderColor: "var(--kid-purple)",
                  background: "color-mix(in oklab, var(--kid-purple) 12%, transparent)",
                  color: "var(--ink)",
                }}
              >
                {i}
                <button
                  type="button"
                  onClick={() => removeInterest(i)}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  aria-label={`Remove ${i}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
        {canProceed
          ? interests.length === 1
            ? <><span className="font-semibold text-ink">1</span> interest picked.</>
            : <><span className="font-semibold text-ink">{interests.length}</span> interests picked.</>
          : "Pick at least one interest to continue."}
      </p>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between sm:gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full rounded-full px-6 py-5 text-base font-semibold sm:w-auto"
        >
          &larr; Back
        </Button>
        <Button
          disabled={!canProceed}
          onClick={onNext}
          className="w-full rounded-full px-8 py-5 text-base font-bold transition-transform hover:scale-[1.02] active:scale-100 sm:w-auto"
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
