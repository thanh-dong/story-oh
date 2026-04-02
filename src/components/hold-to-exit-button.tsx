"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function HoldToExitButton() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const HOLD_DURATION = 2000;
  const UPDATE_INTERVAL = 30;

  const handlePointerDown = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        router.push("/dashboard");
      }
    }, UPDATE_INTERVAL);
  }, [router]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  }, []);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/80 select-none touch-none"
    >
      <svg className="absolute -inset-0.5 size-[calc(100%+4px)]" viewBox="0 0 100 36">
        <rect
          x="1"
          y="1"
          width="98"
          height="34"
          rx="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress * 264} 264`}
          className="text-primary transition-none"
        />
      </svg>
      &#x2190; Hold to exit
    </button>
  );
}
