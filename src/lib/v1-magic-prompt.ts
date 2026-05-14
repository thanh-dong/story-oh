import type { GuestDraftConfig } from "@/lib/db/schema";

// TODO(user): tune this prompt. The Magic ✨ button quality depends entirely
// on this template. Decisions to make:
//  - Should it riff off the existing idea/lesson text, or always start fresh?
//    Currently it riffs if present, generates fresh otherwise.
//  - Tone — playful, warm, parental? Match the editorial tone of the brand?
//  - Should suggestions vary by ageBand (4-6 = animals & simple words,
//    8-12 = adventure & moral ambiguity)? Currently we hint at age but
//    don't enforce it.
//  - Output language — fixed to English for v1? Localize later.

type MagicInput = {
  ageBand: GuestDraftConfig["ageBand"];
  interests: string[];
  idea?: string;
  lesson?: string;
};

export function buildMagicPrompt(input: MagicInput): string {
  const interestsLine = input.interests.length
    ? `Child's interests: ${input.interests.join(", ")}.`
    : "";
  const ideaLine = input.idea?.trim()
    ? `Existing idea (improve or pivot): "${input.idea.trim()}"`
    : "";
  const lessonLine = input.lesson?.trim()
    ? `Existing lesson (improve or pivot): "${input.lesson.trim()}"`
    : "";

  return [
    `You are helping a parent come up with a short bedtime-story idea for a child aged ${input.ageBand}.`,
    interestsLine,
    ideaLine,
    lessonLine,
    "",
    "Return a single JSON object with exactly two fields:",
    '  "idea": one or two sentences describing what the story is about,',
    '  "lesson": one short sentence describing the life lesson the child should take away.',
    "",
    "Keep both fields warm, concrete, and age-appropriate. Avoid sensitive topics. Do not include any prose outside the JSON.",
  ]
    .filter(Boolean)
    .join("\n");
}
