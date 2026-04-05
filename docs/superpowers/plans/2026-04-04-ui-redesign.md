# StoryTime UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic AI-generated look with a warm, playful, hand-crafted feel across all user-facing screens, with proper light/dark mode support.

**Architecture:** Design token overhaul in `globals.css` as the foundation, then shared component upgrades (Button, StoryCard, ChildCard), then per-screen improvements. Each task produces independently working visual improvements.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (CSS-based config via `@theme inline`), shadcn/ui (base-ui variant), Lucide icons, Nunito font

**Spec:** `docs/superpowers/specs/2026-04-04-ui-redesign-design.md`

---

## File Map

### Modified Files

| File | Changes |
|------|---------|
| `src/app/globals.css` | New tokens, shadow utilities, animation keyframes |
| `src/components/ui/button.tsx` | Hover/press interaction classes |
| `src/components/story-card.tsx` | Shadow-card, hover transitions |
| `src/components/child-card.tsx` | Shadow-card, hover transitions |
| `src/app/page.tsx` | Hero gradient, Lucide icons in steps, enhanced CTA |
| `src/app/login/page.tsx` | Split layout with gradient illustration |
| `src/app/explore/page.tsx` | Stagger entrance, card spacing |
| `src/app/dashboard/page.tsx` | Card transitions, add-child card polish |
| `src/app/dashboard/[childId]/page.tsx` | Stats with icons, vocabulary calendar |
| `src/app/dashboard/[childId]/read/page.tsx` | Enhanced greeting, Today's Words, card styling |
| `src/app/dashboard/[childId]/vocabulary/client.tsx` | Gradient accents, colored pills |
| `src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx` | Word cards, play pulse, day pills |
| `src/components/vocabulary/word-list.tsx` | Card-style words, status icons |
| `src/components/vocabulary/word-detail.tsx` | Spotlight, animated play, feedback |
| `src/components/vocabulary/quick-check.tsx` | Circle bg, card options, icons, confetti |
| `src/components/vocabulary/plan-review.tsx` | Topic border accent, colored pills |
| `src/components/vocabulary/plan-progress.tsx` | Animated progress, gradient accent |

---

## Task 1: Foundation — Design Tokens & Animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add new tokens and shadow utilities**

In `src/app/globals.css`, add `--kid-purple` to `:root` after `--kid-green`:

```css
  --kid-purple: oklch(0.65 0.18 290);
```

Add `--kid-purple` to `.dark` after `--kid-green`:

```css
  --kid-purple: oklch(0.72 0.15 290);
```

Add `--color-kid-purple: var(--kid-purple);` to the `@theme inline` block after `--color-kid-green`.

- [ ] **Step 2: Add new shadow utilities**

In `globals.css`, add to the `@layer utilities` block after `storybook-shadow-lg`:

```css
  .shadow-card {
    box-shadow:
      0 4px 16px var(--warm-shadow),
      0 2px 4px oklch(0 0 0 / 4%);
  }
  .shadow-elevated {
    box-shadow:
      0 8px 32px var(--warm-shadow),
      0 4px 8px oklch(0 0 0 / 6%);
  }
```

- [ ] **Step 3: Update animations**

Replace the existing `fade-up` keyframe and `.animate-fade-up` class:

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fade-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

Add new keyframes and classes after the existing animation classes:

```css
@keyframes bounce-soft {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
  60% { transform: translateY(-2px); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}

@keyframes progress-fill {
  from { width: 0%; }
}

.animate-bounce-soft {
  animation: bounce-soft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-shake {
  animation: shake 0.3s ease;
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s ease-out infinite;
}

.animate-progress-fill {
  animation: progress-fill 0.6s ease-out both;
}
```

- [ ] **Step 4: Add reduced motion override**

Add after the animation classes:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-fade-in,
  .animate-scale-in,
  .animate-bounce-soft,
  .animate-shake,
  .animate-pulse-ring,
  .animate-progress-fill,
  .stagger-children > * {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
```

- [ ] **Step 5: Update stagger timing to 30ms**

Replace the stagger delay values:

```css
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 30ms; }
.stagger-children > *:nth-child(3) { animation-delay: 60ms; }
.stagger-children > *:nth-child(4) { animation-delay: 90ms; }
.stagger-children > *:nth-child(5) { animation-delay: 120ms; }
.stagger-children > *:nth-child(6) { animation-delay: 150ms; }
.stagger-children > *:nth-child(7) { animation-delay: 180ms; }
.stagger-children > *:nth-child(8) { animation-delay: 210ms; }
.stagger-children > *:nth-child(9) { animation-delay: 240ms; }
```

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add design tokens, shadows, animations for UI redesign"
```

---

## Task 2: Button Interaction States

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Add hover/press interaction classes to buttonVariants base**

In the `cva()` base string, append these classes after the existing ones:

```
transition-all duration-150 ease-out hover:brightness-105 active:scale-[0.97] active:transition-[transform]_100ms
```

The exact edit: find the base string in `cva(` and append these classes to it.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "style: add hover brightness and press scale to Button"
```

---

## Task 3: Story Card Polish

**Files:**
- Modify: `src/components/story-card.tsx`

- [ ] **Step 1: Upgrade shadow and transition classes**

Replace `storybook-shadow` with `shadow-card` and `hover:storybook-shadow-lg` with `hover:shadow-elevated` in the article className:

Change:
```
className="group relative h-full overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg"
```
To:
```
className="group relative h-full overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated"
```

- [ ] **Step 2: Commit**

```bash
git add src/components/story-card.tsx
git commit -m "style: upgrade story card shadows and transitions"
```

---

## Task 4: Child Card Polish

**Files:**
- Modify: `src/components/child-card.tsx`

- [ ] **Step 1: Upgrade shadow and transition**

Change the article className from:
```
className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg"
```
To:
```
className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated"
```

- [ ] **Step 2: Commit**

```bash
git add src/components/child-card.tsx
git commit -m "style: upgrade child card shadows and transitions"
```

---

## Task 5: Home/Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Enhance hero section**

Replace the hero section (lines 19-53) — change the floating emoji decorations to use a gradient background, update the CTA button:

Replace the decorative spans inside the `pointer-events-none` div with a gradient:

```tsx
<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-kid-purple/5 to-transparent" />
</div>
```

Update the CTA button class from:
```
className="mt-2 rounded-full px-8 py-6 text-lg font-bold storybook-shadow transition-shadow hover:storybook-shadow-lg"
```
To:
```
className="mt-2 rounded-full px-8 py-6 text-lg font-bold shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5"
```

- [ ] **Step 2: Replace emoji Steps with Lucide icons**

Replace the Step component (lines 94-102) with:

```tsx
function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-parchment shadow-card sm:size-16">
        {icon}
      </div>
      <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}
```

Update the Step usages to use Lucide icons. Add import at top:
```tsx
import { BookOpen, MessageCircleQuestion, Sparkles } from "lucide-react";
```

Replace the Step calls:
```tsx
<Step icon={<BookOpen className="size-6 text-primary sm:size-7" />} label="Pick a story" />
<Arrow />
<Step icon={<MessageCircleQuestion className="size-6 text-kid-orange sm:size-7" />} label="Make choices" />
<Arrow />
<Step icon={<Sparkles className="size-6 text-kid-pink sm:size-7" />} label="Discover endings" />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: enhance home page hero, replace emoji icons with Lucide SVGs"
```

---

## Task 6: Login Page

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Add gradient illustration area**

Replace the outer div className:
```
className="flex flex-col items-center py-12 sm:py-20"
```
With a split layout:
```
className="flex min-h-[60vh] flex-col items-center justify-center py-12 sm:flex-row sm:py-0"
```

Add a gradient illustration panel before the form div. Add import for Lucide icons:
```tsx
import { BookOpen, Star, Sparkles } from "lucide-react";
```

Add before `<div className="w-full max-w-sm ...">`:
```tsx
<div className="hidden sm:flex sm:w-1/2 sm:items-center sm:justify-center">
  <div className="relative flex size-64 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 via-kid-purple/20 to-kid-pink/10">
    <BookOpen className="size-16 text-primary/60" />
    <Star className="absolute right-4 top-4 size-6 text-kid-yellow animate-pulse" />
    <Sparkles className="absolute bottom-6 left-4 size-5 text-kid-pink/60" />
  </div>
</div>
```

Update the form card container class — add shadow and rounded:
```
className="w-full max-w-sm animate-fade-up space-y-6 rounded-2xl bg-card p-6 shadow-card sm:p-8"
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "style: add gradient illustration to login, card styling"
```

---

## Task 7: Explore Page

**Files:**
- Modify: `src/app/explore/page.tsx`

- [ ] **Step 1: Minor polish**

This page is already well-structured. Just ensure the grid uses the updated stagger timing (already handled in Task 1). No changes needed beyond what Task 1 and Task 3 provide.

- [ ] **Step 2: Commit (skip if no changes)**

---

## Task 8: Parent Dashboard Root

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Polish add-child card**

The card styles are already upgraded via Task 4 (ChildCard). The Add Child card just needs the shadow update.

Replace `storybook-shadow` if present in the page. The Add Child card looks good already with dashed border. No changes needed — Task 4 handles the ChildCard, and the stagger timing is handled by Task 1.

- [ ] **Step 2: Commit (skip if no changes)**

---

## Task 9: Child Dashboard — Stats & Vocabulary Section

**Files:**
- Modify: `src/app/dashboard/[childId]/page.tsx`

- [ ] **Step 1: Replace plain stats with colorful icon cards**

Read the file first. Find the stats grid (3 columns showing Assigned/In Progress/Completed). Replace the plain number cards with icon-enhanced versions.

Add imports:
```tsx
import { BookOpen, Play, CheckCircle } from "lucide-react";
```

Replace the stats grid content. Each stat card should follow this pattern:
```tsx
<div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
    <BookOpen className="size-5 text-primary" />
  </div>
  <div>
    <p className="text-2xl font-bold">{assignedStories.length}</p>
    <p className="text-xs text-muted-foreground">Assigned</p>
  </div>
</div>
```

Use `Play` with `bg-kid-yellow/20 text-kid-orange` for In Progress and `CheckCircle` with `bg-kid-green/20 text-kid-green` for Completed.

- [ ] **Step 2: Replace storybook-shadow with shadow-card across the page**

Find and replace all `storybook-shadow` occurrences with `shadow-card` in this file.

- [ ] **Step 3: Animate the vocabulary progress bar**

Find the progress bar div and add `animate-progress-fill` class to the inner fill div.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[childId]/page.tsx
git commit -m "style: colorful stat cards with icons, animated progress bar on child dashboard"
```

---

## Task 10: Kid Reading Hub

**Files:**
- Modify: `src/app/dashboard/[childId]/read/page.tsx`

- [ ] **Step 1: Enhance greeting**

Read the file. Find the avatar/greeting section. Make the avatar larger:

Change `text-5xl` to `text-6xl` on the avatar span. Make the name text larger.

- [ ] **Step 2: Enhance Today's Words card**

Find the "Today's Words" Link card. Make it taller with more padding and add an animated arrow:

Add import:
```tsx
import { ArrowRight } from "lucide-react";
```

Update the card to include topic info and an arrow:
```tsx
<div className="rounded-2xl bg-gradient-to-br from-kid-yellow to-kid-orange p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <span className="text-5xl">📚</span>
      <div>
        <h2 className="text-xl font-extrabold text-white">Today&apos;s Words</h2>
        <p className="text-sm text-white/80">
          {vocabPlan.wordsTotal} words to learn
        </p>
      </div>
    </div>
    <ArrowRight className="size-6 text-white/60 transition-transform group-hover:translate-x-1" />
  </div>
</div>
```

- [ ] **Step 3: Upgrade story cards in the grid**

Replace `storybook-shadow` with `shadow-card` and `hover:storybook-shadow-lg` with `hover:shadow-elevated` in the story card articles.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[childId]/read/page.tsx
git commit -m "style: enhanced greeting, Today's Words card, and story cards in kid reading hub"
```

---

## Task 11: Vocabulary Word List

**Files:**
- Modify: `src/components/vocabulary/word-list.tsx`

- [ ] **Step 1: Upgrade to card-style words**

Replace the button styling to use cards with left border accent for active state:

Active word:
```
className="flex items-center gap-3 rounded-xl border-l-4 border-primary bg-primary/10 px-4 py-3 text-left shadow-card transition-all"
```

Listened word:
```
className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-left text-muted-foreground transition-all"
```

Default word:
```
className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-left shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5"
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vocabulary/word-list.tsx
git commit -m "style: card-style word list with active border accent"
```

---

## Task 12: Vocabulary Word Detail

**Files:**
- Modify: `src/components/vocabulary/word-detail.tsx`

- [ ] **Step 1: Add gradient spotlight behind emoji**

Wrap the emoji span with a gradient circle:
```tsx
<div className="relative">
  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-kid-yellow/20 to-kid-orange/10 blur-xl" />
  <span className="relative text-8xl drop-shadow-md animate-fade-up">
    {word.emoji}
  </span>
</div>
```

- [ ] **Step 2: Enhance play button**

Update the play button to be a gradient circle with pulse ring:
```tsx
<div className="relative">
  {audioState === "idle" && (
    <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
  )}
  <Button
    size="lg"
    onClick={handlePlay}
    disabled={audioState === "loading"}
    className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-2xl text-white shadow-card hover:shadow-elevated"
  >
    {audioState === "loading"
      ? "..."
      : audioState === "playing"
        ? "||"
        : "\u25B6"}
  </Button>
</div>
```

- [ ] **Step 3: Upgrade word text size and pronunciation**

Change word text from `text-4xl` to `text-5xl`. Wrap pronunciation in a pill:
```tsx
<span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
  {word.pronunciation}
</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/vocabulary/word-detail.tsx
git commit -m "style: gradient spotlight, pulse play button, enhanced word detail"
```

---

## Task 13: Quick Check Quiz

**Files:**
- Modify: `src/components/vocabulary/quick-check.tsx`

- [ ] **Step 1: Add emoji circle background**

Replace the bare emoji span with a colored circle:
```tsx
<div className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-kid-yellow/20 to-kid-orange/10">
  <span className="text-7xl">{current.emoji}</span>
</div>
```

- [ ] **Step 2: Replace text progress with dots**

Replace `{currentIndex + 1} / {shuffledWords.length}` with:
```tsx
<div className="flex gap-1.5">
  {shuffledWords.map((_, i) => (
    <div
      key={i}
      className={`size-2.5 rounded-full transition-colors ${
        i < currentIndex
          ? "bg-kid-green"
          : i === currentIndex
            ? "bg-primary"
            : "bg-muted"
      }`}
    />
  ))}
</div>
```

- [ ] **Step 3: Upgrade answer buttons to cards**

Replace `variant="outline"` buttons with styled cards. Add X icon for wrong feedback:

Add import:
```tsx
import { Check, X } from "lucide-react";
```

For the correct feedback, add checkmark icon alongside text:
```tsx
{feedback === "correct" && (
  <div className="flex items-center gap-2 text-xl font-bold text-kid-green animate-bounce-soft">
    <Check className="size-6" />
    Correct!
  </div>
)}
{feedback === "wrong" && (
  <div className="flex items-center gap-2 text-xl font-bold text-destructive animate-shake">
    <X className="size-6" />
    Try again!
  </div>
)}
```

Style answer buttons as cards:
```
className="h-16 rounded-2xl border-2 text-lg font-bold transition-all hover:border-primary hover:shadow-card"
```

- [ ] **Step 4: Enhance celebration screen**

Replace the completion view with a warmer celebration:
```tsx
<div className="flex flex-col items-center justify-center gap-6 rounded-3xl bg-gradient-to-br from-kid-yellow/20 via-kid-green/10 to-kid-purple/10 p-12">
  <span className="text-7xl animate-bounce-soft">🎉</span>
  <h2 className="text-3xl font-extrabold">Great job!</h2>
  <p className="text-lg text-muted-foreground">
    You finished today's words!
  </p>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/vocabulary/quick-check.tsx
git commit -m "style: circle emoji, dot progress, card answers, celebration in quiz"
```

---

## Task 14: Plan Review & Plan Progress Polish

**Files:**
- Modify: `src/components/vocabulary/plan-review.tsx`
- Modify: `src/components/vocabulary/plan-progress.tsx`

- [ ] **Step 1: Add topic border accent to plan-review**

In `plan-review.tsx`, add a colored left border to each day card:

Change the day card div className from:
```
className="rounded-xl bg-card p-4 storybook-shadow"
```
To:
```
className="rounded-xl border-l-4 border-primary/30 bg-card p-4 shadow-card"
```

For review days, use a different border color:
```
className={`rounded-xl border-l-4 ${day.isReview ? "border-kid-purple/40" : "border-primary/30"} bg-card p-4 shadow-card`}
```

- [ ] **Step 2: Add gradient top border to plan-progress**

In `plan-progress.tsx`, update the outer card:

Change:
```
className="rounded-2xl bg-card p-6 storybook-shadow space-y-4"
```
To:
```
className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card space-y-4"
```

Add a gradient top bar as the first child inside the div:
```tsx
<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-kid-pink" />
```

- [ ] **Step 3: Animate the progress bar**

In `plan-progress.tsx`, add `animate-progress-fill` to the progress bar fill div.

- [ ] **Step 4: Commit**

```bash
git add src/components/vocabulary/plan-review.tsx src/components/vocabulary/plan-progress.tsx
git commit -m "style: topic border accents, gradient header, animated progress in vocab components"
```

---

## Task 15: Vocabulary Learning Client Page

**Files:**
- Modify: `src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx`

- [ ] **Step 1: Enhance day selector pills**

Find the day selector button styling. Update:

Current day:
```
className="shrink-0 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1.5 text-sm font-semibold text-white shadow-card transition-all"
```

Other days:
```
className="shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition-all hover:bg-muted"
```

- [ ] **Step 2: Upgrade the detail panel placeholder**

Replace the pointing finger emoji placeholder with a friendlier version:
```tsx
<div className="text-center text-muted-foreground p-8">
  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-kid-yellow/20 to-kid-orange/10">
    <span className="text-4xl">👋</span>
  </div>
  <p className="text-lg font-semibold">
    {childName}, tap a word to start learning!
  </p>
</div>
```

- [ ] **Step 3: Upgrade detail panel container**

Change the right panel from:
```
className="md:w-[70%] flex items-center justify-center min-h-[400px] rounded-2xl bg-card storybook-shadow"
```
To:
```
className="md:w-[70%] flex items-center justify-center min-h-[400px] rounded-2xl bg-card shadow-card"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx
git commit -m "style: enhanced day selector, detail placeholder, and shadows in vocab learning"
```

---

## Task 16: Final Smoke Test

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | head -20`

Fix any type errors.

- [ ] **Step 2: Visual verification**

Start dev server and verify each screen:
1. Login page — gradient illustration visible on desktop
2. Home page — Lucide icons in steps, gradient bg in hero
3. Explore — card hover transitions smooth
4. Dashboard — child card hover transitions
5. Child dashboard — colorful stat cards, animated progress bar
6. Kid reading hub — larger greeting, enhanced Today's Words
7. Vocabulary learning — card-style word list, spotlight detail, pulse play
8. Quiz — circle emoji, dot progress, card answers, celebration

- [ ] **Step 3: Dark mode verification**

Toggle dark mode and verify all screens look correct. Check:
- Card shadows visible but not harsh
- Kid colors remain vibrant
- Text contrast readable
- Gradient areas not too bright

- [ ] **Step 4: Commit any fixes**

```bash
git add src/
git commit -m "fix: resolve visual issues from UI redesign smoke test"
```

---

## Summary of Commits

| # | Message |
|---|---------|
| 1 | `style: add design tokens, shadows, animations for UI redesign` |
| 2 | `style: add hover brightness and press scale to Button` |
| 3 | `style: upgrade story card shadows and transitions` |
| 4 | `style: upgrade child card shadows and transitions` |
| 5 | `style: enhance home page hero, replace emoji icons with Lucide SVGs` |
| 6 | `style: add gradient illustration to login, card styling` |
| 7 | (skip — no changes needed, handled by Tasks 1+3) |
| 8 | (skip — no changes needed, handled by Tasks 1+4) |
| 9 | `style: colorful stat cards with icons, animated progress bar on child dashboard` |
| 10 | `style: enhanced greeting, Today's Words card, and story cards in kid reading hub` |
| 11 | `style: card-style word list with active border accent` |
| 12 | `style: gradient spotlight, pulse play button, enhanced word detail` |
| 13 | `style: circle emoji, dot progress, card answers, celebration in quiz` |
| 14 | `style: topic border accents, gradient header, animated progress in vocab components` |
| 15 | `style: enhanced day selector, detail placeholder, and shadows in vocab learning` |
| 16 | `fix: resolve visual issues from UI redesign smoke test` |
