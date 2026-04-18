interface OrnamentProps {
  kind?: "star" | "leaf" | "diamond" | "sun";
  size?: number;
  color?: string;
  className?: string;
}

export function Ornament({ kind = "star", size = 20, color = "var(--kid-orange)", className }: OrnamentProps) {
  if (kind === "star") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className={className}>
        <path d="M12 2l2.6 6.5L21 10l-5 4.5 1.5 6.5L12 17.5 6.5 21 8 14.5 3 10l6.4-1.5L12 2z" />
      </svg>
    );
  }
  if (kind === "leaf") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className={className}>
        <path d="M4 20c8 0 16-8 16-16C12 4 4 12 4 20z" />
      </svg>
    );
  }
  if (kind === "diamond") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className={className}>
        <path d="M12 2l10 10-10 10L2 12z" />
      </svg>
    );
  }
  if (kind === "sun") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className={className}>
        <circle cx="12" cy="12" r="5" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="11" y="0" width="2" height="4" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </svg>
    );
  }
  return null;
}
