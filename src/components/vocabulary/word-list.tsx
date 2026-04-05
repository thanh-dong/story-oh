"use client";

interface WordItem {
  id: string;
  word: string;
  emoji: string;
  listened: boolean;
}

interface WordListProps {
  words: WordItem[];
  activeWordId: string | null;
  onSelect: (wordId: string) => void;
}

export function WordList({ words, activeWordId, onSelect }: WordListProps) {
  return (
    <div className="flex flex-col gap-2">
      {words.map((w) => (
        <button
          key={w.id}
          onClick={() => onSelect(w.id)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
            activeWordId === w.id
              ? "border-l-4 border-primary bg-primary/10 shadow-card"
              : w.listened
                ? "bg-muted/50 text-muted-foreground"
                : "bg-card shadow-card hover:shadow-elevated hover:-translate-y-0.5"
          }`}
        >
          <span className="text-2xl">{w.emoji}</span>
          <span className="font-bold text-lg">{w.word}</span>
          {w.listened && activeWordId !== w.id && (
            <span className="ml-auto text-green-500">&#x2713;</span>
          )}
        </button>
      ))}
    </div>
  );
}
