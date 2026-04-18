export function PageBreadcrumbs({ count = 5, current = 2 }: { count?: number; current?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-[width] duration-200"
          style={{
            width: i === current ? 24 : 6,
            background: i <= current ? "var(--primary)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}
