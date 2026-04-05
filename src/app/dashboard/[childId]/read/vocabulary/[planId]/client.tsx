"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { VocabularyPlan } from "@/lib/vocabulary-types";
import { WordList } from "@/components/vocabulary/word-list";
import { WordDetail } from "@/components/vocabulary/word-detail";
import { QuickCheck } from "@/components/vocabulary/quick-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VocabPlanRow {
  id: string;
  weekStartDate: string;
  plan: VocabularyPlan;
  [key: string]: unknown;
}

interface VocabWordRow {
  id: string;
  word: string;
  emoji: string;
  pronunciation: string;
  promptSentence: string;
  weekNumber: number;
  day: number;
  topic: string;
  [key: string]: unknown;
}

interface VocabProgressRow {
  wordId: string;
  listened: boolean;
  [key: string]: unknown;
}

interface VocabularyLearningClientProps {
  plan: VocabPlanRow;
  words: VocabWordRow[];
  progress: VocabProgressRow[];
  currentWeek: number;
  currentDay: number;
  childId: string;
  childName: string;
  voice: string;
  choiceCount: number;
  backHref: string;
}

export function VocabularyLearningClient({
  plan,
  words,
  progress,
  currentWeek,
  currentDay,
  childId,
  childName,
  voice,
  choiceCount,
  backHref,
}: VocabularyLearningClientProps) {
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [listenedIds, setListenedIds] = useState<Set<string>>(
    new Set(progress.filter((p) => p.listened).map((p) => p.wordId))
  );

  const dayWords = words.filter(
    (w) => w.weekNumber === selectedWeek && w.day === selectedDay
  );

  const allListened = dayWords.every((w) => listenedIds.has(w.id));

  const activeWord = dayWords.find((w) => w.id === activeWordId);

  const availableDays: Array<{ week: number; day: number; topic: string }> = [];
  for (const week of plan.plan.weeks) {
    for (const day of week.days) {
      const dayDate = new Date(plan.weekStartDate);
      dayDate.setDate(
        dayDate.getDate() + (week.weekNumber - 1) * 7 + (day.day - 1)
      );
      if (dayDate <= new Date()) {
        availableDays.push({
          week: week.weekNumber,
          day: day.day,
          topic: day.topic,
        });
      }
    }
  }

  const currentTopic =
    plan.plan.weeks
      .find((w) => w.weekNumber === selectedWeek)
      ?.days.find((d) => d.day === selectedDay)?.topic || "";

  const handleListened = useCallback(
    (wordId: string) => {
      setListenedIds((prev) => new Set(prev).add(wordId));
      fetch("/api/vocabulary/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          planId: plan.id,
          childId,
          type: "listened",
        }),
      }).catch(() => {});
    },
    [plan.id, childId]
  );

  const handleQuizResult = useCallback(
    (wordId: string, correct: boolean, attempts: number) => {
      fetch("/api/vocabulary/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          planId: plan.id,
          childId,
          type: "quiz",
          quizCorrect: correct,
        }),
      }).catch(() => {});
    },
    [plan.id, childId]
  );

  if (showQuiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-parchment">
        <QuickCheck
          words={dayWords.map((w) => ({
            id: w.id,
            word: w.word,
            emoji: w.emoji,
          }))}
          choiceCount={choiceCount}
          onResult={handleQuizResult}
          onComplete={() => {}}
        />
        <Link href={backHref} className="mt-8">
          <Button variant="outline">Back to stories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{currentTopic}</h1>
          <p className="text-sm text-muted-foreground">
            Week {selectedWeek}, Day {selectedDay}
          </p>
        </div>
        <Badge variant="secondary">
          {listenedIds.size}/{dayWords.length} words
        </Badge>
      </div>

      <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
        {availableDays.map((d) => (
          <button
            key={`${d.week}-${d.day}`}
            onClick={() => {
              setSelectedWeek(d.week);
              setSelectedDay(d.day);
              setActiveWordId(null);
              setShowQuiz(false);
            }}
            className={
              d.week === selectedWeek && d.day === selectedDay
                ? "shrink-0 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1.5 text-sm font-semibold text-white shadow-card transition-all"
                : "shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition-all hover:bg-muted"
            }
          >
            W{d.week}D{d.day}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4">
        <div className="md:w-[30%]">
          <WordList
            words={dayWords.map((w) => ({
              id: w.id,
              word: w.word,
              emoji: w.emoji,
              listened: listenedIds.has(w.id),
            }))}
            activeWordId={activeWordId}
            onSelect={setActiveWordId}
          />

          {allListened && !showQuiz && (
            <Button
              className="w-full mt-4"
              onClick={() => setShowQuiz(true)}
            >
              Let's check!
            </Button>
          )}
        </div>

        <div className="md:w-[70%] flex items-center justify-center min-h-[400px] rounded-2xl bg-card shadow-card">
          {activeWord ? (
            <WordDetail
              word={activeWord}
              voice={voice}
              onListened={handleListened}
            />
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-kid-yellow/20 to-kid-orange/10">
                <span className="text-4xl">👋</span>
              </div>
              <p className="text-lg font-semibold">
                {childName}, tap a word to start learning!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
