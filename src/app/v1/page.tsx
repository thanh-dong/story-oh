"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PersonalizeStep } from "@/components/v1/personalize-step";
import { InterestsStep } from "@/components/v1/interests-step";
import { IdeaStep } from "@/components/v1/idea-step";
import { Ornament } from "@/components/editorial";
import { cn } from "@/lib/utils";
import type { GuestDraftConfig, V1Language } from "@/lib/db/schema";
import { emitV1 } from "@/lib/v1-telemetry";
import { useSession } from "@/lib/auth-client";
import { dobToAgeBand } from "@/lib/v1-age-band";

type Step = 0 | 1 | 2;

interface WizardState {
  ageBand: GuestDraftConfig["ageBand"] | null;
  length: GuestDraftConfig["length"] | null;
  language: GuestDraftConfig["language"];
  interests: string[];
  idea: string;
  lesson: string;
  mainCharacterName: string;
}

interface ChildProfile {
  id: string;
  name: string;
  dateOfBirth: string;
  interests?: string[];
  nativeLanguage?: string;
}

function isV1Language(s: unknown): s is V1Language {
  return s === "en" || s === "vi" || s === "de";
}

const STEP_LABELS = ["Personalize", "Interests", "Idea"];

export default function V1WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WizardState>({
    ageBand: null,
    length: null,
    language: "en",
    interests: [],
    idea: "",
    lesson: "",
    mainCharacterName: "",
  });
  const [prefilledFromChild, setPrefilledFromChild] = useState<string | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    emitV1("v1.start");
  }, []);

  // Pre-fill from the user's first child profile when logged in. Best-effort:
  // network errors / no children → silently skip.
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/children");
        if (!res.ok) return;
        const list = (await res.json()) as ChildProfile[];
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        const child = list[0];
        const lang = isV1Language(child.nativeLanguage) ? child.nativeLanguage : "en";
        setConfig((prev) => ({
          ageBand: prev.ageBand ?? dobToAgeBand(child.dateOfBirth),
          length: prev.length ?? "standard",
          language: prev.language === "en" ? lang : prev.language,
          interests:
            prev.interests.length > 0 ? prev.interests : (child.interests ?? []),
          idea: prev.idea,
          lesson: prev.lesson,
          mainCharacterName:
            prev.mainCharacterName.trim().length > 0 ? prev.mainCharacterName : child.name,
        }));
        setPrefilledFromChild(child.name);
      } catch {
        // ignore — anonymous flow still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!config.ageBand || !config.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageBand: config.ageBand,
          length: config.length,
          language: config.language,
          interests: config.interests,
          idea: config.idea,
          lesson: config.lesson,
          ...(config.mainCharacterName.trim()
            ? { mainCharacterName: config.mainCharacterName.trim() }
            : {}),
        } satisfies GuestDraftConfig),
      });
      if (res.status === 429) {
        setError("Free preview already used — please sign up to create more.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      router.push(`/v1/preview/${data.draftId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-10">
        <div className="mx-auto w-full max-w-xl space-y-7 sm:max-w-2xl sm:space-y-8">
          {/* Editorial eyebrow */}
          <div className="flex items-center gap-2.5">
            <div className="h-px w-8 bg-ink sm:w-10" />
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink sm:text-[11px]">
              Your free story
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-2 sm:space-y-3">
            <h1
              className="display text-3xl font-black leading-[1.05] sm:text-4xl lg:text-[44px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Create a{" "}
              <em className="font-medium italic text-primary">personal</em>{" "}
              story.
            </h1>
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
              Tell us about your child and we&rsquo;ll generate a story made just for them — free, no account needed.
            </p>
          </div>

          {prefilledFromChild && (
            <div
              className="flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-sm animate-in fade-in slide-in-from-top-2"
              style={{
                borderColor: "color-mix(in oklab, var(--kid-green) 40%, transparent)",
                background: "color-mix(in oklab, var(--kid-green) 10%, transparent)",
              }}
            >
              <Ornament kind="leaf" size={14} color="var(--kid-green)" />
              <span className="flex-1 text-foreground">
                Pre-filled from{" "}
                <span className="font-semibold">{prefilledFromChild}</span>
                &rsquo;s profile — feel free to tweak.
              </span>
            </div>
          )}

          {/* Progress indicator */}
          <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Wizard progress">
            {STEP_LABELS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex flex-1 items-center gap-1.5 sm:flex-initial sm:gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                        active || done
                          ? "bg-primary text-white"
                          : "border-2 border-border text-muted-foreground",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={cn(
                        "mono truncate text-[10px] uppercase tracking-[0.14em] sm:text-[11px]",
                        active
                          ? "font-semibold text-ink"
                          : "font-medium text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <span className="h-px flex-1 bg-border sm:w-6 sm:flex-initial" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Step content */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:rounded-[20px] sm:p-7 lg:p-8">
            <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {step === 0 && (
                <PersonalizeStep
                  ageBand={config.ageBand}
                  length={config.length}
                  language={config.language}
                  onAgeBandChange={(v) => update("ageBand", v)}
                  onLengthChange={(v) => update("length", v)}
                  onLanguageChange={(v) => update("language", v)}
                  onNext={() => setStep(1)}
                />
              )}
              {step === 1 && (
                <InterestsStep
                  interests={config.interests}
                  mainCharacterName={config.mainCharacterName}
                  onInterestsChange={(v) => update("interests", v)}
                  onMainCharacterNameChange={(v) => update("mainCharacterName", v)}
                  onBack={() => setStep(0)}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && config.ageBand && config.length && (
                <IdeaStep
                  ageBand={config.ageBand}
                  length={config.length}
                  interests={config.interests}
                  idea={config.idea}
                  lesson={config.lesson}
                  onIdeaChange={(v) => update("idea", v)}
                  onLessonChange={(v) => update("lesson", v)}
                  onBack={() => setStep(1)}
                  onEditStep={(s) => setStep(s)}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  error={error}
                />
              )}
            </div>
          </div>

          {/* Decorative ornaments */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <Ornament kind="diamond" size={10} color="var(--kid-orange)" />
            <Ornament kind="star" size={12} color="var(--kid-yellow)" />
            <Ornament kind="diamond" size={10} color="var(--kid-pink)" />
          </div>
        </div>
      </div>
    </div>
  );
}
