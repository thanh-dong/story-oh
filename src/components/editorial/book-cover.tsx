interface BookCoverProps {
  title: string;
  palette?: [string, string];
  tall?: boolean;
  tag?: string;
}

export function BookCover({
  title,
  palette = ["#E4A94B", "#B9463F"],
  tall = false,
  tag,
}: BookCoverProps) {
  const [c1, c2] = palette;
  return (
    <div
      className="relative w-full overflow-hidden rounded-[14px]"
      style={{
        height: tall ? 240 : 180,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,0.12), inset 4px 0 0 rgba(0,0,0,0.22), inset -1px 0 0 rgba(255,255,255,0.18)",
      }}
    >
      {/* deckle lines */}
      <div className="absolute left-[18px] right-[18px] top-[18px] h-px bg-white/35" />
      <div className="absolute bottom-[18px] left-[18px] right-[18px] h-px bg-white/35" />
      {/* title plate */}
      <div
        className="display absolute left-[18px] right-[18px] top-1/2 -translate-y-1/2 text-center font-black leading-[1.05] text-white"
        style={{
          fontSize: tall ? 26 : 20,
          textShadow: "0 2px 0 rgba(0,0,0,0.18)",
          padding: "0 6px",
        }}
      >
        {title}
      </div>
      {/* spine */}
      <div className="absolute bottom-[30px] left-3 top-[30px] w-0.5 bg-white/25" />
      {/* tag */}
      {tag && (
        <div className="absolute right-2.5 top-2.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
          {tag}
        </div>
      )}
      {/* page edge */}
      <div className="absolute bottom-0 right-0 top-0 w-1.5 bg-gradient-to-r from-black/[0.18] to-transparent" />
    </div>
  );
}
