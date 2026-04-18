import type { ReactNode } from "react";

type Tone = "muted" | "yellow" | "green" | "purple" | "pink" | "primary";

const tones: Record<Tone, { bg: string; fg: string }> = {
  muted: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
  yellow: { bg: "oklch(0.87 0.16 85 / 0.18)", fg: "oklch(0.55 0.16 55)" },
  green: { bg: "oklch(0.70 0.16 155 / 0.18)", fg: "oklch(0.45 0.15 155)" },
  purple: { bg: "oklch(0.65 0.18 290 / 0.14)", fg: "oklch(0.45 0.18 290)" },
  pink: { bg: "oklch(0.68 0.19 350 / 0.14)", fg: "oklch(0.50 0.18 350)" },
  primary: { bg: "oklch(0.52 0.18 275 / 0.12)", fg: "var(--primary)" },
};

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}

export function Pill({ children, tone = "muted", icon }: PillProps) {
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-[0.02em]"
      style={{ background: t.bg, color: t.fg }}
    >
      {icon}
      {children}
    </span>
  );
}
