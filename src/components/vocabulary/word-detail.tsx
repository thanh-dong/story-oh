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
    audioUrl?: string | null;
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
      let audioSrc: string;
      let isBlobUrl = false;

      if (word.audioUrl?.startsWith("https://")) {
        // Pre-generated — play directly from Supabase Storage, no API call needed
        audioSrc = word.audioUrl;
      } else {
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
        audioSrc = URL.createObjectURL(blob);
        isBlobUrl = true;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        // Only revoke blob URLs — revoking a regular URL is a no-op but be explicit
        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }

      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onended = () => {
        setAudioState("idle");
        if (isBlobUrl) URL.revokeObjectURL(audioSrc);
      };

      audio.onerror = () => {
        setAudioState("idle");
        if (isBlobUrl) URL.revokeObjectURL(audioSrc);
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
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-kid-yellow/20 to-kid-orange/10 blur-xl" />
        <span className="relative text-8xl drop-shadow-md animate-fade-up">
          {word.emoji}
        </span>
      </div>
      <h2 className="text-5xl font-extrabold tracking-tight">
        {word.word}
      </h2>
      <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
        {word.pronunciation}
      </span>
      <div className="relative">
        {audioState === "idle" && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        )}
        <Button
          size="lg"
          onClick={handlePlay}
          disabled={audioState === "loading"}
          className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-2xl text-white shadow-card hover:shadow-elevated"
        >
          {audioState === "loading"
            ? "..."
            : audioState === "playing"
              ? "||"
              : "\u25B6"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Tap to hear the word. Listen and repeat!
      </p>
    </div>
  );
}
