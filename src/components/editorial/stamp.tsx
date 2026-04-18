type Tone = "primary" | "orange" | "purple" | "green" | "pink";

const toneMap: Record<Tone, [string, string]> = {
  primary: ["var(--primary)", "var(--primary-foreground)"],
  orange: ["var(--kid-orange)", "#fff"],
  purple: ["var(--kid-purple)", "#fff"],
  green: ["var(--kid-green)", "#fff"],
  pink: ["var(--kid-pink)", "#fff"],
};

interface StampProps {
  n: number;
  tone?: Tone;
}

export function Stamp({ n, tone = "primary" }: StampProps) {
  const [bg, fg] = toneMap[tone];
  return (
    <div
      className="display grid size-14 shrink-0 place-items-center rounded-[14px] text-[26px] font-black"
      style={{
        background: bg,
        color: fg,
        boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.18), 0 2px 0 rgba(0,0,0,0.08)",
      }}
    >
      {String(n).padStart(2, "0")}
    </div>
  );
}
