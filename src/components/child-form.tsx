"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATAR_OPTIONS = [
  "\u{1F981}", "\u{1F428}", "\u{1F98A}", "\u{1F430}", "\u{1F43B}",
  "\u{1F98B}", "\u{1F42C}", "\u{1F984}", "\u{1F438}", "\u{1F427}",
  "\u{1F989}", "\u{1F41D}", "\u{1F422}", "\u{1F99C}", "\u{1F419}",
  "\u{1F988}", "\u{1F33A}", "\u{1F308}", "\u{2B50}", "\u{1F344}",
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Ti\u1EBFng Vi\u1EC7t" },
  { value: "de", label: "Deutsch" },
];

const INTEREST_PRESETS = [
  "animals", "space", "dinosaurs", "ocean", "cooking", "sports",
  "music", "fairy tales", "robots", "nature", "friendship", "adventure",
];

const DAILY_GOAL_OPTIONS = [
  { value: null, label: "No goal" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
];

interface ChildFormProps {
  initialData?: {
    name?: string;
    dateOfBirth?: string;
    avatar?: string;
    nativeLanguage?: string;
    learningLanguages?: string[];
    interests?: string[];
    dailyGoalMinutes?: number | null;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
}

export function ChildForm({ initialData, onSubmit, submitLabel }: ChildFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth ?? "");
  const [avatar, setAvatar] = useState(initialData?.avatar ?? AVATAR_OPTIONS[0]);
  const [nativeLanguage, setNativeLanguage] = useState(initialData?.nativeLanguage ?? "en");
  const [learningLanguages, setLearningLanguages] = useState<string[]>(
    initialData?.learningLanguages ?? []
  );
  const [interests, setInterests] = useState<string[]>(initialData?.interests ?? []);
  const [customInterest, setCustomInterest] = useState("");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number | null>(
    initialData?.dailyGoalMinutes ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleLearningLanguage(lang: string) {
    setLearningLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  function addCustomInterest() {
    const trimmed = customInterest.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
    }
    setCustomInterest("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        name,
        dateOfBirth,
        avatar,
        nativeLanguage,
        learningLanguages,
        interests,
        dailyGoalMinutes,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8 animate-fade-up">
      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          placeholder="Child's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Avatar */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm leading-none font-medium">Avatar</legend>
        <div className="grid grid-cols-10 gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              className={`flex size-10 items-center justify-center rounded-xl text-xl transition-all ${
                avatar === emoji
                  ? "ring-2 ring-primary ring-offset-2 bg-primary/10 scale-110"
                  : "hover:bg-muted"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Native Language */}
      <div className="space-y-2">
        <Label htmlFor="nativeLanguage">Native Language</Label>
        <select
          id="nativeLanguage"
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
          className="h-8 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Learning Languages */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm leading-none font-medium">Learning Languages</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => toggleLearningLanguage(lang.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                learningLanguages.includes(lang.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Interests */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-sm leading-none font-medium">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTEREST_PRESETS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all ${
                interests.includes(interest)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom interest"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomInterest();
              }
            }}
            className="rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={addCustomInterest}
          >
            Add
          </Button>
        </div>
        {interests.filter((i) => !INTEREST_PRESETS.includes(i)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {interests
              .filter((i) => !INTEREST_PRESETS.includes(i))
              .map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium capitalize text-primary-foreground transition-all"
                >
                  {interest} &times;
                </button>
              ))}
          </div>
        )}
      </fieldset>

      {/* Daily Goal */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm leading-none font-medium">Daily Reading Goal</legend>
        <div className="flex flex-wrap gap-2">
          {DAILY_GOAL_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setDailyGoalMinutes(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                dailyGoalMinutes === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          size="lg"
          className="rounded-full px-8 font-bold"
          disabled={submitting}
        >
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="rounded-full px-8"
          render={<Link href="/dashboard" />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
