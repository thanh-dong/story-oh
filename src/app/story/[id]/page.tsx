import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BookCover, Ornament, Pill, Stamp } from "@/components/editorial";
import type { StoryTree } from "@/lib/types";

const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"],
  ["#6E5FA8", "#3C2F6A"],
  ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"],
  ["#4D728F", "#1F3B52"],
  ["#8A5893", "#432948"],
];

function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, id));

  if (!story) notFound();

  if (story.created_by) {
    const session = await getSession();
    if (!session || session.user.id !== story.created_by) {
      notFound();
    }
  }

  const tree = story.story_tree as StoryTree;
  const totalPages = Object.keys(tree).length;
  const totalEndings = Object.values(tree).filter((n) => n.choices.length === 0).length;
  const totalChoices = Object.values(tree).reduce((s, n) => s + n.choices.length, 0);
  const palette = getPalette(story.title);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          &larr; Back to library
        </Link>

        {/* Cover */}
        <div className="overflow-hidden rounded-[18px] shadow-elevated">
          {story.cover_image ? (
            <div className="relative h-[280px] w-full sm:h-[360px]">
              <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
              <div className="absolute right-3 top-3 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[4px]">
                Ages {story.age_range}
              </div>
            </div>
          ) : (
            <BookCover title={story.title} palette={palette} tall tag={`Ages ${story.age_range}`} />
          )}
        </div>

        {/* Info */}
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Pill tone="primary">Ages {story.age_range}</Pill>
          </div>

          <h1
            className="display text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {story.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {story.summary}
          </p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { n: totalPages, label: "Pages", tone: "primary" as const },
              { n: totalChoices, label: "Choices", tone: "orange" as const },
              { n: totalEndings, label: "Endings", tone: "purple" as const },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-[14px] border border-border bg-parchment px-4 py-3">
                <Stamp n={s.n} tone={s.tone} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/story/${story.id}/read`}
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-4 text-lg font-bold text-background shadow-elevated transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <Ornament kind="star" size={16} color="var(--background)" />
            Start Reading
          </Link>
        </div>

        {/* Decorative ornaments */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Ornament kind="diamond" size={10} color="var(--kid-orange)" />
          <Ornament kind="star" size={12} color="var(--kid-yellow)" />
          <Ornament kind="diamond" size={10} color="var(--kid-pink)" />
        </div>
      </div>
    </div>
  );
}
