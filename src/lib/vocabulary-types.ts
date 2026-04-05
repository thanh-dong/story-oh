// src/lib/vocabulary-types.ts

export interface VocabularyWordEntry {
  word: string;
  emoji: string;
  pronunciation: string;
  promptSentence: string;
}

export interface VocabularyDay {
  day: number;
  topic: string;
  isReview: boolean;
  words: VocabularyWordEntry[];
}

export interface VocabularyWeek {
  weekNumber: number;
  days: VocabularyDay[];
}

export interface VocabularyPlan {
  weeks: VocabularyWeek[];
  quizOptions: {
    choiceCount: number;
  };
}

export type VocabularyPlanStatus =
  | "draft"
  | "approved"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export interface CreatePlanRequest {
  childId: string;
  learningLanguage: string;
  weeksRequested: number;
}

export interface RecordProgressRequest {
  wordId: string;
  planId: string;
  childId: string;
  type: "listened" | "quiz";
  quizCorrect?: boolean;
}
