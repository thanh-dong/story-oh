import Image from "next/image";
import { getGradient, getStoryEmoji } from "@/lib/gradients";

interface StoryCoverProps {
  title: string;
  coverImage: string | null;
  /** Tailwind height class, e.g. "h-28", "h-40 sm:h-44" */
  heightClass: string;
  /** Emoji size class, e.g. "text-4xl", "text-6xl sm:text-7xl" */
  emojiClass?: string;
  children?: React.ReactNode;
}

export function StoryCover({
  title,
  coverImage,
  heightClass,
  emojiClass = "text-4xl drop-shadow-md",
  children,
}: StoryCoverProps) {
  const gradient = getGradient(title);
  const emoji = getStoryEmoji(title);

  return (
    <div
      className={`relative flex ${heightClass} w-full items-center justify-center overflow-hidden ${
        coverImage ? "" : `bg-gradient-to-br ${gradient}`
      }`}
    >
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <span className={emojiClass} aria-hidden="true">
          {emoji}
        </span>
      )}
      {children}
    </div>
  );
}
