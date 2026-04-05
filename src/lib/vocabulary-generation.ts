// src/lib/vocabulary-generation.ts
import type { VocabularyPlan } from "@/lib/vocabulary-types";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  de: "German",
};

const PLAN_RESPONSE_SCHEMA = `{
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": 1,
          "topic": "string",
          "isReview": false,
          "words": [
            {
              "word": "string (in learning language)",
              "emoji": "string (single emoji)",
              "pronunciation": "string (IPA format)",
              "promptSentence": "string (native language prompt)"
            }
          ]
        }
      ]
    }
  ],
  "quizOptions": {
    "choiceCount": 3
  }
}`;

function buildVocabularyPrompt(params: {
  childName: string;
  childAge: number;
  interests: string[];
  nativeLanguage: string;
  learningLanguage: string;
  weeksRequested: number;
}): { system: string; user: string } {
  const {
    childName,
    childAge,
    interests,
    nativeLanguage,
    learningLanguage,
    weeksRequested,
  } = params;

  const nativeLangName = LANGUAGE_NAMES[nativeLanguage] || nativeLanguage;
  const learningLangName = LANGUAGE_NAMES[learningLanguage] || learningLanguage;

  const wordsPerTopic =
    childAge <= 6 ? "3-5" : childAge <= 9 ? "5-7" : "6-8";
  const quizChoices = childAge <= 6 ? 2 : childAge <= 9 ? 3 : 4;
  const complexity =
    childAge <= 6
      ? "very simple, everyday words a young child encounters (animals, colors, body parts, food, family)"
      : childAge <= 9
        ? "moderate vocabulary including descriptive words, actions, and common objects"
        : "richer vocabulary including abstract concepts, compound words, and subject-specific terms";

  const system = `You are a language learning curriculum designer for children. You create weekly vocabulary learning plans in JSON format.

CHILD PROFILE:
- Name: ${childName}
- Age: ${childAge} years old
- Native language: ${nativeLangName}
- Learning: ${learningLangName}
- Interests: ${interests.length > 0 ? interests.join(", ") : "general"}

PLAN RULES:
- Create exactly ${weeksRequested} week(s) of vocabulary content
- Each week has 7 days (day 1 = Monday through day 7 = Sunday)
- Days 1-5 (Monday-Friday): new learning topics with ${wordsPerTopic} words each
- Days 6-7 (Saturday-Sunday): review days mixing words from the week (isReview: true)
- Harder or broader topics may span 2 consecutive days
- Topics should connect to the child's interests when possible
- Word complexity: ${complexity}
- Each word needs an emoji, IPA pronunciation, and a native-language prompt sentence

PROMPT SENTENCE RULES:
- Written in ${nativeLangName}, personalized with "${childName}"
- Warm, encouraging, conversational — like a parent or tutor talking to the child
- Include "repeat after me" naturally woven in with varied phrasings
- End with the word clearly in ${learningLangName}
- EVERY sentence must be UNIQUE — vary structure, tone, and phrasing
- Keep sentences natural and smooth, easy for a ${childAge}-year-old to understand

QUIZ OPTIONS:
- Set choiceCount to ${quizChoices}

Output ONLY valid JSON matching this schema:
${PLAN_RESPONSE_SCHEMA}`;

  const user = `Create a ${weeksRequested}-week ${learningLangName} vocabulary plan for ${childName} (age ${childAge}). ${
    interests.length > 0
      ? `Include topics related to: ${interests.join(", ")}.`
      : "Use common everyday topics appropriate for the age."
  }`;

  return { system, user };
}

export function validateVocabularyPlan(plan: unknown): plan is VocabularyPlan {
  if (typeof plan !== "object" || plan === null || Array.isArray(plan))
    return false;
  const p = plan as Record<string, unknown>;

  if (!Array.isArray(p.weeks) || p.weeks.length === 0) return false;

  for (const week of p.weeks) {
    const w = week as Record<string, unknown>;
    if (typeof w.weekNumber !== "number") return false;
    if (!Array.isArray(w.days) || w.days.length === 0) return false;

    for (const day of w.days) {
      const d = day as Record<string, unknown>;
      if (typeof d.day !== "number" || d.day < 1 || d.day > 7) return false;
      if (typeof d.topic !== "string") return false;
      if (typeof d.isReview !== "boolean") return false;
      if (!Array.isArray(d.words) || d.words.length === 0) return false;

      for (const word of d.words) {
        const wrd = word as Record<string, unknown>;
        if (typeof wrd.word !== "string") return false;
        if (typeof wrd.emoji !== "string") return false;
        if (typeof wrd.pronunciation !== "string") return false;
        if (typeof wrd.promptSentence !== "string") return false;
      }
    }
  }

  if (
    typeof p.quizOptions !== "object" ||
    p.quizOptions === null ||
    typeof (p.quizOptions as Record<string, unknown>).choiceCount !== "number"
  )
    return false;

  return true;
}

export function countWordsInPlan(plan: VocabularyPlan): number {
  let count = 0;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      count += day.words.length;
    }
  }
  return count;
}

export interface VocabularyGenerationResult {
  plan: VocabularyPlan;
  completionTokens: number;
}

export async function generateVocabularyPlan(params: {
  childName: string;
  childAge: number;
  interests: string[];
  nativeLanguage: string;
  learningLanguage: string;
  weeksRequested: number;
}): Promise<
  | { ok: true; data: VocabularyGenerationResult }
  | { ok: false; error: string; status: number }
> {
  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;

  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    return { ok: false, error: "AI provider not configured.", status: 500 };
  }

  const { system, user } = buildVocabularyPrompt(params);

  let llmResponse: Response;
  try {
    llmResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "AI request timed out. Please try again."
        : "Failed to connect to AI provider.";
    return { ok: false, error: message, status: 500 };
  }

  if (!llmResponse.ok) {
    const text = await llmResponse.text().catch(() => "unknown error");
    return {
      ok: false,
      error: `AI provider returned ${llmResponse.status}: ${text}`,
      status: 500,
    };
  }

  let json: any;
  try {
    json = await llmResponse.json();
  } catch {
    return { ok: false, error: "AI returned invalid JSON.", status: 500 };
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "AI returned an empty response.", status: 500 };
  }

  let result: VocabularyPlan;
  try {
    result = JSON.parse(content);
  } catch {
    return { ok: false, error: "AI returned invalid JSON.", status: 500 };
  }

  if (!validateVocabularyPlan(result)) {
    return {
      ok: false,
      error: "AI generated an invalid vocabulary plan. Please try again.",
      status: 500,
    };
  }

  const completionTokens = json.usage?.completion_tokens ?? 0;

  return {
    ok: true,
    data: { plan: result, completionTokens },
  };
}
