"use client";

import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/editorial";
import { cn } from "@/lib/utils";
import type { GuestDraftConfig } from "@/lib/db/schema";

type AgeBand = GuestDraftConfig["ageBand"];
type Length = GuestDraftConfig["length"];
type Language = GuestDraftConfig["language"];

interface PersonalizeStepProps {
  ageBand: AgeBand | null;
  length: Length | null;
  language: Language;
  onAgeBandChange: (v: AgeBand) => void;
  onLengthChange: (v: Length) => void;
  onLanguageChange: (v: Language) => void;
  onNext: () => void;
}

type Tone = "yellow" | "orange" | "pink" | "green" | "purple";

interface AgeOption {
  value: AgeBand;
  label: string;
  sub: string;
  tone: Tone;
  ornament: "leaf" | "sun" | "star";
}

interface LengthOption {
  value: Length;
  label: string;
  sub: string;
  tone: Tone;
  marks: number;
}

const ageBands: AgeOption[] = [
  { value: "4-6", label: "Ages 4–6", sub: "Early listeners", tone: "yellow", ornament: "leaf" },
  { value: "6-8", label: "Ages 6–8", sub: "Growing readers", tone: "orange", ornament: "sun" },
  { value: "8-12", label: "Ages 8–12", sub: "Young adventurers", tone: "pink", ornament: "star" },
];

const lengths: LengthOption[] = [
  { value: "quick", label: "Quick", sub: "~3 min", tone: "green", marks: 1 },
  { value: "standard", label: "Standard", sub: "~5 min", tone: "orange", marks: 2 },
  { value: "longer", label: "Longer", sub: "~10 min", tone: "purple", marks: 3 },
];

interface LanguageOption {
  value: Language;
  code: string;
  label: string;
}

const languages: LanguageOption[] = [
  { value: "en", code: "EN", label: "English" },
  { value: "vi", code: "VN", label: "Tiếng Việt" },
  { value: "de", code: "DE", label: "Deutsch" },
];

const toneVar: Record<Tone, string> = {
  yellow: "var(--kid-yellow)",
  orange: "var(--kid-orange)",
  pink: "var(--kid-pink)",
  green: "var(--kid-green)",
  purple: "var(--kid-purple)",
};

function PickerCard({
  selected,
  onClick,
  label,
  sub,
  tone,
  visual,
  ariaLabel,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  tone: Tone;
  visual: React.ReactNode;
  ariaLabel: string;
}) {
  const color = toneVar[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
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
              backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
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
        {visual}
      </div>

      <div className="min-w-0 space-y-0.5">
        <div
          className="display truncate text-sm font-extrabold text-ink sm:text-base"
          style={{ letterSpacing: "-0.01em" }}
        >
          {label}
        </div>
        <div className="mono truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {sub}
        </div>
      </div>
    </button>
  );
}

function LengthMarks({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex items-end gap-[3px]">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="block rounded-sm transition-all duration-200"
          style={{
            width: 3,
            height: i <= count ? 5 + i * 3 : 5,
            background: i <= count ? color : "color-mix(in oklab, currentColor 18%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

export function PersonalizeStep({
  ageBand,
  length,
  language,
  onAgeBandChange,
  onLengthChange,
  onLanguageChange,
  onNext,
}: PersonalizeStepProps) {
  const canProceed = ageBand !== null && length !== null;
  const selectedAge = ageBands.find((b) => b.value === ageBand);
  const selectedLen = lengths.find((l) => l.value === length);

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="space-y-1">
        <h2
          className="display text-xl font-black text-ink sm:text-2xl"
          style={{ letterSpacing: "-0.015em" }}
        >
          Tell us about{" "}
          <em className="font-medium italic text-kid-orange">your reader</em>
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick an age range and how long the story should be.
        </p>
      </header>

      <section className="space-y-3">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
          Child&rsquo;s age
        </p>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {ageBands.map((b) => (
            <PickerCard
              key={b.value}
              selected={ageBand === b.value}
              onClick={() => onAgeBandChange(b.value)}
              label={b.label}
              sub={b.sub}
              tone={b.tone}
              visual={<Ornament kind={b.ornament} size={16} color={toneVar[b.tone]} />}
              ariaLabel={`${b.label}, ${b.sub}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
          Story length
        </p>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {lengths.map((l) => (
            <PickerCard
              key={l.value}
              selected={length === l.value}
              onClick={() => onLengthChange(l.value)}
              label={l.label}
              sub={l.sub}
              tone={l.tone}
              visual={<LengthMarks count={l.marks} color={toneVar[l.tone]} />}
              ariaLabel={`${l.label}, ${l.sub}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
          Story language
        </p>
        <div
          className="inline-flex rounded-full border-2 border-border bg-card p-1"
          role="radiogroup"
          aria-label="Story language"
        >
          {languages.map((l) => {
            const active = language === l.value;
            return (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onLanguageChange(l.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all duration-200 sm:px-4",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mono text-[10px] tracking-[0.14em]">{l.code}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {canProceed && selectedAge && selectedLen && (
        <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
          A{" "}
          <span className="font-semibold text-ink">{selectedLen.label.toLowerCase()}</span>{" "}
          story for{" "}
          <span className="font-semibold text-ink">{selectedAge.label.toLowerCase()}</span>
          {language !== "en" && (
            <>
              {" "}in{" "}
              <span className="font-semibold text-ink">
                {languages.find((l) => l.value === language)?.label}
              </span>
            </>
          )}
          .
        </p>
      )}

      <div className="flex justify-end pt-1">
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
