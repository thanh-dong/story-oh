export function estimateCost(params: {
  expectedReadingTime: number;
  maxBranches: number;
  difficulty: "easy" | "medium" | "hard";
}): number {
  const base = 5;
  const timeCost = params.expectedReadingTime * 3;
  const branchCost = params.maxBranches * 2;
  const difficultyBonus = { easy: 0, medium: 3, hard: 6 }[params.difficulty];
  return base + timeCost + branchCost + difficultyBonus;
}

export function calculateActualCost(
  estimatedCost: number,
  completionTokens: number,
): number {
  // Token adjustment: the estimate is the baseline. Actual cost adjusts ±20%
  // based on how many tokens the LLM actually used vs a typical generation.
  //
  // Typical generation: ~1200 completion tokens.
  // - 1200 tokens → factor 1.0 (pay the estimate)
  // - 600 tokens → factor 0.8 (20% discount)
  // - 1800+ tokens → factor 1.2 (20% surcharge, capped)
  const typicalTokens = 1200;
  const deviation = (completionTokens - typicalTokens) / typicalTokens; // -1 to +inf
  const factor = 1 + Math.max(-0.2, Math.min(0.2, deviation * 0.4));
  const raw = Math.round(estimatedCost * factor);
  return Math.max(5, raw);
}
