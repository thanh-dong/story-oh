export function CornerFold({ color = "var(--parchment-2)" }: { color?: string }) {
  return (
    <div
      className="absolute right-0 top-0 size-7"
      style={{
        background: `linear-gradient(225deg, var(--background) 50%, ${color} 50%)`,
        boxShadow: "-1px 1px 2px rgba(0,0,0,0.06)",
      }}
    />
  );
}
