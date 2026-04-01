export const gradients = [
  "from-purple-400 to-pink-400",
  "from-blue-400 to-cyan-400",
  "from-orange-400 to-yellow-400",
  "from-green-400 to-teal-400",
  "from-red-400 to-orange-400",
  "from-indigo-400 to-purple-400",
  "from-pink-400 to-rose-400",
  "from-teal-400 to-emerald-400",
];

export function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function getStoryEmoji(title: string): string {
  if (title.includes("Dragon")) return "\uD83D\uDC32";
  if (title.includes("Ocean")) return "\uD83C\uDF0A";
  if (title.includes("Space")) return "\uD83D\uDE80";
  return "\uD83D\uDCDA";
}
