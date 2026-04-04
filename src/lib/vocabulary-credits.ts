// src/lib/vocabulary-credits.ts

export function estimateVocabularyCost(
  weeksRequested: number,
  childAge: number
): number {
  const baseCost = 3;
  const wordsPerWeek = childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
  const costPerWord = 0.15;
  return Math.round(baseCost + wordsPerWeek * weeksRequested * costPerWord);
}

export function getWordsPerWeekForAge(childAge: number): number {
  return childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
}
