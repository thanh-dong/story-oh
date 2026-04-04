"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface QuizWord {
  id: string;
  word: string;
  emoji: string;
}

interface QuickCheckProps {
  words: QuizWord[];
  choiceCount: number;
  onResult: (wordId: string, correct: boolean, attempts: number) => void;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuickCheck({
  words,
  choiceCount,
  onResult,
  onComplete,
}: QuickCheckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [completed, setCompleted] = useState(false);

  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const current = shuffledWords[currentIndex];

  const options = useMemo(() => {
    if (!current) return [];
    const others = words.filter((w) => w.id !== current.id);
    const distractors = shuffle(others).slice(0, choiceCount - 1);
    return shuffle([current, ...distractors]);
  }, [current, words, choiceCount]);

  function handleChoice(chosen: QuizWord) {
    const isCorrect = chosen.id === current.id;
    const newAttempts = attempts + 1;

    if (isCorrect) {
      setFeedback("correct");
      onResult(current.id, true, newAttempts);

      setTimeout(() => {
        setFeedback(null);
        setAttempts(0);
        if (currentIndex + 1 >= shuffledWords.length) {
          setCompleted(true);
          onComplete();
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 1500);
    } else {
      setFeedback("wrong");
      setAttempts(newAttempts);

      if (newAttempts >= 2) {
        onResult(current.id, false, newAttempts);
        setTimeout(() => {
          setFeedback(null);
          setAttempts(0);
          if (currentIndex + 1 >= shuffledWords.length) {
            setCompleted(true);
            onComplete();
          } else {
            setCurrentIndex((i) => i + 1);
          }
        }, 1500);
      } else {
        setTimeout(() => setFeedback(null), 1000);
      }
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <span className="text-6xl">&#x1F389;</span>
        <h2 className="text-2xl font-extrabold">Great job!</h2>
        <p className="text-muted-foreground">
          You finished today's words!
        </p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <p className="text-sm text-muted-foreground">
        {currentIndex + 1} / {shuffledWords.length}
      </p>
      <span className="text-7xl">{current.emoji}</span>

      {feedback === "correct" && (
        <p className="text-xl font-bold text-green-600 animate-fade-up">
          &#x2713; Correct!
        </p>
      )}
      {feedback === "wrong" && (
        <p className="text-xl font-bold text-orange-500 animate-fade-up">
          Try again!
        </p>
      )}

      {feedback !== "correct" && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {options.map((opt) => (
            <Button
              key={opt.id}
              variant="outline"
              size="lg"
              onClick={() => handleChoice(opt)}
              disabled={feedback !== null}
              className="h-14 text-lg font-bold"
            >
              {opt.word}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
