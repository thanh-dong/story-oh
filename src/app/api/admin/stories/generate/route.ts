import { NextResponse } from "next/server";
import type { GenerateStoryRequest, StoryTree } from "@/lib/types";

function validateRequest(body: unknown): { valid: true; data: GenerateStoryRequest } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (!b.keyword || typeof b.keyword !== "string" || b.keyword.trim() === "") {
    return { valid: false, error: "keyword is required" };
  }
  if (b.keyword.length > 200) {
    return { valid: false, error: "keyword must be 200 characters or less" };
  }
  if (b.language !== "en" && b.language !== "vi" && b.language !== "de") {
    return { valid: false, error: "language must be 'en', 'vi', or 'de'" };
  }
  if (b.audienceAge !== "4-8" && b.audienceAge !== "8-12") {
    return { valid: false, error: "audienceAge must be '4-8' or '8-12'" };
  }
  if (typeof b.isForChildren !== "boolean") {
    return { valid: false, error: "isForChildren must be a boolean" };
  }
  if (typeof b.expectedReadingTime !== "number" || b.expectedReadingTime <= 0 || b.expectedReadingTime > 30) {
    return { valid: false, error: "expectedReadingTime must be between 1 and 30 minutes" };
  }
  if (b.difficulty !== "easy" && b.difficulty !== "medium" && b.difficulty !== "hard") {
    return { valid: false, error: "difficulty must be 'easy', 'medium', or 'hard'" };
  }
  if (typeof b.minBranches !== "number" || b.minBranches < 1) {
    return { valid: false, error: "minBranches must be at least 1" };
  }
  if (typeof b.maxBranches !== "number" || b.maxBranches < b.minBranches || b.maxBranches > 20) {
    return { valid: false, error: "maxBranches must be >= minBranches and <= 20" };
  }

  return { valid: true, data: b as unknown as GenerateStoryRequest };
}

function validateStoryTree(tree: unknown): tree is StoryTree {
  if (typeof tree !== "object" || tree === null || Array.isArray(tree)) return false;
  const t = tree as Record<string, unknown>;

  if (!("start" in t)) return false;

  const nodeIds = Object.keys(t);
  if (nodeIds.length === 0 || nodeIds.length > 200) return false;

  let hasEnding = false;

  for (const nodeId of nodeIds) {
    const node = t[nodeId] as Record<string, unknown>;
    if (typeof node.text !== "string") return false;
    if (!Array.isArray(node.choices)) return false;

    if (node.choices.length === 0) {
      hasEnding = true;
      continue;
    }

    for (const choice of node.choices) {
      const c = choice as Record<string, unknown>;
      if (typeof c.label !== "string") return false;
      if (typeof c.next !== "string") return false;
      if (!t[c.next]) return false;
    }
  }

  return hasEnding;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  de: "German",
};

const RESPONSE_SCHEMA = `{
  "title": "string",
  "summary": "string",
  "age_range": "string",
  "story_tree": {
    "start": {
      "text": "string",
      "choices": [{ "label": "string", "next": "string (node_id)" }]
    },
    "<node_id>": {
      "text": "string",
      "choices": []
    }
  }
}`;

function buildPrompt(req: GenerateStoryRequest): { system: string; user: string } {
  const nodeCount = req.expectedReadingTime * 3;
  const langName = LANGUAGE_NAMES[req.language] || "English";

  const system = `You are a children's story writer. You create interactive branching stories in JSON format.
You MUST write all story content (title, summary, node text, choice labels) in ${langName}.

Output ONLY valid JSON matching this exact schema:
${RESPONSE_SCHEMA}

Rules:
- ALL text content (title, summary, story text, choice labels) MUST be written in ${langName}
- The story_tree MUST have a "start" node as the entry point
- Node IDs must be lowercase ASCII with underscores (e.g., "explore_cave", "talk_to_wizard") regardless of language
- Every choice "next" value must reference an existing node ID
- Ending nodes have an empty choices array: "choices": []
- There must be at least one ending node
- Target approximately ${nodeCount} total nodes
- Include between ${req.minBranches} and ${req.maxBranches} branching points (nodes with 2+ choices)
- Each choice should lead to meaningfully different story paths
- ${req.isForChildren ? "Content must be safe and appropriate for children" : "Content should be appropriate for the target age group"}
- Difficulty "${req.difficulty}" means: ${req.difficulty === "easy" ? "simple vocabulary, short sentences, straightforward plot" : req.difficulty === "medium" ? "moderate vocabulary, varied sentence length, some complexity" : "rich vocabulary, complex sentences, nuanced plot"}`;

  const user = `Create an interactive branching story in ${langName} about "${req.keyword}" for readers aged ${req.audienceAge}. Expected reading time: ${req.expectedReadingTime} minutes. Difficulty: ${req.difficulty}. Branches: ${req.minBranches}-${req.maxBranches}.`;

  return { system, user };
}

export async function POST(request: Request) {
  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;

  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    return NextResponse.json(
      { error: "AI provider not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL environment variables." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { system, user } = buildPrompt(validation.data);

  let llmResponse: Response;
  try {
    llmResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
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
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    const message = err instanceof Error && err.name === "TimeoutError"
      ? "AI request timed out after 60 seconds. Please try again."
      : "Failed to connect to AI provider.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!llmResponse.ok) {
    const text = await llmResponse.text().catch(() => "unknown error");
    return NextResponse.json(
      { error: `AI provider returned ${llmResponse.status}: ${text}` },
      { status: 500 }
    );
  }

  let result: { title: string; summary: string; age_range: string; story_tree: StoryTree };
  try {
    const json = await llmResponse.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 500 });
    }
    result = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 500 });
  }

  if (typeof result.title !== "string" || typeof result.summary !== "string") {
    return NextResponse.json({ error: "AI response missing title or summary." }, { status: 500 });
  }

  if (!validateStoryTree(result.story_tree)) {
    return NextResponse.json(
      { error: "AI generated an invalid story structure. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    title: result.title,
    summary: result.summary,
    age_range: result.age_range || validation.data.audienceAge,
    story_tree: result.story_tree,
  });
}
