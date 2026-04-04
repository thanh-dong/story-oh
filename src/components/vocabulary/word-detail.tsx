"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface WordDetailProps {
  word: {
    id: string;
    word: string;
    emoji: string;
    pronunciation: string;
    promptSentence: string;
  };
  voice: string;
  onListened: (wordId: string) => void;
}

export function WordDetail({ word, voice, onListened }: WordDetailProps) {
  const [audioState, setAudioState] = useState<
    "idle" | "loading" | "playing"
  >("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handlePlay() {
    if (audioState === "playing" && audioRef.current) {
      audioRef.current.pause();
      setAudioState("idle");
      return;
    }

    setAudioState("loading");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word.promptSentence, voice }),
      });

      if (!res.ok) {
        setAudioState("idle");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setAudioState("idle");
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setAudioState("idle");
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setAudioState("playing");
      onListened(word.id);
    } catch {
      setAudioState("idle");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <span className="text-8xl drop-shadow-md animate-fade-up">
        {word.emoji}
      </span>
      <h2 className="text-4xl font-extrabold tracking-tight">
        {word.word}
      </h2>
      <p className="text-lg text-muted-foreground">{word.pronunciation}</p>
      <Button
        size="lg"
        onClick={handlePlay}
        disabled={audioState === "loading"}
        className="h-16 w-16 rounded-full text-2xl"
      >
        {audioState === "loading"
          ? "..."
          : audioState === "playing"
            ? "||"
            : "\u25B6"}
      </Button>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Tap to hear the word. Listen and repeat!
      </p>
    </div>
  );
}
