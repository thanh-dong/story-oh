interface ShelfLabelProps {
  roman: string;
  title: string;
  sub: string;
}

export function ShelfLabel({ roman, title, sub }: ShelfLabelProps) {
  return (
    <div className="mb-5 flex items-baseline gap-3.5">
      <span className="display text-5xl font-black italic text-primary" style={{ letterSpacing: "-0.03em" }}>
        {roman}
      </span>
      <div>
        <h2 className="display m-0 text-[30px] font-black" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <div className="text-[13px] text-muted-foreground">{sub}</div>
      </div>
      <div className="ml-5 h-px flex-1 bg-border" />
    </div>
  );
}
