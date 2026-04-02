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
  maxTokens: number = 4096
): number {
  const ratio = completionTokens / maxTokens;
  const raw = Math.round(estimatedCost * ratio);
  const min = 5;
  const max = Math.round(estimatedCost * 1.2);
  return Math.max(min, Math.min(max, raw));
}
