// Avatars stored on the `children` table are rendered verbatim by ChildCard,
// so they need to be glyphs (emoji), not arbitrary strings. We pick a stable
// default from the same pool the manual /dashboard/new form uses, so a v1
// auto-created profile looks identical to one the parent picked themselves.

const V1_AVATAR_POOL = [
  "\u{1F981}", // lion
  "\u{1F428}", // koala
  "\u{1F98A}", // fox
  "\u{1F430}", // rabbit
  "\u{1F43B}", // bear
  "\u{1F42C}", // dolphin
  "\u{1F984}", // unicorn
  "\u{1F438}", // frog
  "\u{1F427}", // penguin
  "\u{1F989}", // owl
];

// Pick deterministically from the child's name so the same parent
// recreating the same profile gets the same icon. Falls back to lion.
export function defaultV1Avatar(seed?: string | null): string {
  if (!seed) return V1_AVATAR_POOL[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return V1_AVATAR_POOL[hash % V1_AVATAR_POOL.length]!;
}
