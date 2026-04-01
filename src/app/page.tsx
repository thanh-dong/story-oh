import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Hero Section */}
      <section className="flex flex-col items-center gap-6 py-12 sm:py-20">
        <div className="text-5xl sm:text-6xl" aria-hidden="true">
          🐉 🚀 🐠
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Choose Your Adventure!
        </h1>

        <p className="max-w-md text-lg text-muted-foreground sm:text-xl">
          Interactive stories for kids aged 4-12
        </p>

        <Link href="/explore">
          <Button className="mt-4 rounded-full px-8 py-6 text-lg font-bold">
            Explore Stories
          </Button>
        </Link>
      </section>

      {/* Feature Highlights */}
      <section className="grid w-full max-w-3xl gap-6 py-12 sm:grid-cols-3">
        <FeatureCard
          emoji="🔀"
          title="Choose Your Path"
          description="Make decisions that shape the story"
        />
        <FeatureCard
          emoji="🎭"
          title="Multiple Endings"
          description="Every choice leads somewhere new"
        />
        <FeatureCard
          emoji="💾"
          title="Save Your Progress"
          description="Pick up right where you left off"
        />
      </section>
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
