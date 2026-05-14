import type { GuestDraftConfig } from "@/lib/db/schema";
import type { GenerateStoryRequest } from "@/lib/types";

// TODO(user): tune these mappings. Each call here directly shapes story output
// quality — your domain knowledge improves this more than mine.
//
// Questions to answer:
//  - How long should "Quick" actually feel? 2 min? 3? The wireframe says
//    "~3 min", but that's a label, not a token budget.
//  - For the 4-6 bucket, do we want the SAME generation as 6-8 (collapsed to
//    audienceAge "4-8") or do we cap branches/difficulty harder for the
//    younger end? Currently 4-6 and 6-8 both collapse to "4-8" with no extra
//    knob.
//  - Should `lesson` be encoded into `description`, or do we add a new field
//    to GenerateStoryRequest? Right now we concatenate.
//
// Replace any of the constants below as needed.

const LENGTH_TO_MINUTES: Record<GuestDraftConfig["length"], number> = {
  quick: 3,
  standard: 5,
  longer: 10,
};

const LENGTH_TO_BRANCHES: Record<
  GuestDraftConfig["length"],
  { min: number; max: number }
> = {
  quick: { min: 2, max: 3 },
  standard: { min: 3, max: 4 },
  longer: { min: 4, max: 5 },
};

function mapAge(ageBand: GuestDraftConfig["ageBand"]): GenerateStoryRequest["audienceAge"] {
  // 3 UI buckets → 2 API buckets. 4-6 and 6-8 collapse to "4-8".
  return ageBand === "8-12" ? "8-12" : "4-8";
}

function mapDifficulty(
  ageBand: GuestDraftConfig["ageBand"],
): GenerateStoryRequest["difficulty"] {
  // TODO(user): tune. Right now: youngest → easy, middle → medium, oldest → hard.
  if (ageBand === "4-6") return "easy";
  if (ageBand === "6-8") return "medium";
  return "hard";
}

export function mapV1ConfigToGenerateRequest(
  config: GuestDraftConfig,
): GenerateStoryRequest {
  const { min, max } = LENGTH_TO_BRANCHES[config.length];
  const characterLine = config.mainCharacterName?.trim()
    ? `Main character: ${config.mainCharacterName.trim()}. Use this name throughout the story.`
    : "";
  const description = [
    characterLine,
    config.idea.trim(),
    config.lesson.trim() ? `Lesson: ${config.lesson.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    keyword: config.interests.join(", "),
    description,
    language: config.language ?? "en",
    audienceAge: mapAge(config.ageBand),
    isForChildren: true,
    expectedReadingTime: LENGTH_TO_MINUTES[config.length],
    difficulty: mapDifficulty(config.ageBand),
    minBranches: min,
    maxBranches: max,
  };
}
