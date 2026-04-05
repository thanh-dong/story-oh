# StoryTime UI Redesign — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

A comprehensive UI redesign of all user-facing screens in the StoryTime app. The goal is to replace the generic, AI-generated look with a warm, playful, hand-crafted feel. The app serves two audiences: parents (dashboard, plan management) and children ages 4-12 (reading hub, vocabulary learning, quiz). Both light and dark modes are supported through the existing oklch-based design token system.

## Design Direction

**Warm and playful, but not childish.** Clean layouts with rounded corners, soft shadows, and vibrant accent colors. Parents see a polished dashboard. Kids see big, colorful, touchable elements. Same design language, kid-facing screens dial up the playfulness.

## Design Tokens

> **Important:** All color values use the oklch color space to match the existing `globals.css` system. Hex equivalents are shown for reference only.

> **Token strategy:** The existing `--secondary` and `--accent` tokens are structural (used for UI surfaces throughout shadcn components). They are NOT redefined. Kid-specific colors use the existing `--kid-*` namespace. A new `--kid-purple` token is added.

### New & Modified Tokens — Light Mode (`:root`)

Only tokens that change or are new. All existing tokens not listed here remain unchanged.

| Token | oklch Value | Hex Ref | Change Type | Usage |
|-------|------------|---------|-------------|-------|
| `--background` | `oklch(0.98 0.005 250)` | ~#FAFBFE | Modified — cooler blue-gray tint | Page background |
| `--kid-yellow` | `oklch(0.87 0.16 85)` | ~#FBBF24 | Unchanged | Kid highlights, stars |
| `--kid-orange` | `oklch(0.73 0.17 55)` | ~#F97316 | Unchanged | Kid gradients |
| `--kid-green` | `oklch(0.70 0.16 155)` | ~#34D399 | Unchanged | Success, correct answers |
| `--kid-pink` | `oklch(0.68 0.19 350)` | ~#EC4899 | Unchanged — repurposed for celebrations | Quiz delight, confetti |
| `--kid-purple` | `oklch(0.65 0.18 290)` | ~#A78BFA | **New** | Story/reading accents, hero gradients |

### New & Modified Tokens — Dark Mode (`.dark`)

| Token | oklch Value | Hex Ref | Notes |
|-------|------------|---------|-------|
| `--kid-purple` | `oklch(0.72 0.15 290)` | ~#C4B5FD | **New** — lighter for dark backgrounds |

All other dark-mode tokens remain unchanged — the existing warm lamplight dark palette is preserved.

### Shadow System

Added alongside existing `storybook-shadow` / `storybook-shadow-lg` (which remain for backward compatibility and are gradually replaced):

```css
@layer utilities {
  .shadow-soft {
    box-shadow: 0 2px 8px var(--warm-shadow), 0 1px 2px oklch(0 0 0 / 4%);
  }
  .shadow-card {
    box-shadow: 0 4px 16px var(--warm-shadow), 0 2px 4px oklch(0 0 0 / 4%);
  }
  .shadow-elevated {
    box-shadow: 0 8px 32px var(--warm-shadow), 0 4px 8px oklch(0 0 0 / 6%);
  }
}
```

Uses `--warm-shadow` which already adapts between light/dark mode.

### Border Radius

Keeps the existing relative `calc(var(--radius) * N)` system. No changes needed — current values are appropriate.

### Typography

Keeps Nunito (already loaded). No font changes. Scale:
- Display: 36px/40px bold (hero headings)
- H1: 30px/36px extrabold
- H2: 24px/32px bold
- H3: 20px/28px bold
- Body: 16px/24px regular
- Small: 14px/20px regular
- Caption: 12px/16px medium

## Animation System

All animations defined via `@theme inline` and `@keyframes` in `globals.css` (Tailwind v4 CSS-based config — no `tailwind.config.ts` exists in this project).

### New Keyframes & Utilities

| Utility | Effect | Duration | Notes |
|---------|--------|----------|-------|
| `animate-fade-up` | Fade in + translate up 8px | 300ms | **Modify existing** (currently 500ms/12px — shorten) |
| `animate-scale-press` | Scale to 0.97 on active | 150ms | New |
| `animate-bounce-soft` | Single gentle bounce | 400ms | New |
| `animate-shake` | Horizontal shake 3px | 300ms | New |
| `animate-progress-fill` | Width from 0% to target | 600ms ease-out | New |
| `animate-stagger` | Per-child delay via nth-child selectors | 30ms * nth | New — uses `nth-child` CSS, not JS-set variables |

Existing `animate-scale-in`, `animate-fade-in` preserved.

### Interaction States

**Buttons:**
- Hover: brightness lift + shadow-soft. Transition: 150ms ease-out.
- Press (`:active`): scale 0.97. Transition: 100ms.
- **Focus-visible:** preserved — existing `outline-ring/50` style remains.

**Cards:**
- Hover: translate-y -2px + shadow upgrades. Transition: 200ms.
- Press: translate-y 0 + scale 0.99.
- Focus-visible: ring outline for keyboard nav.

**Word pills (kid mode):**
- Tap: background transitions to primary, emoji does bounce.
- Listened: muted background + checkmark fades in.

**Quiz options:**
- Hover: border shifts to primary.
- Correct: green fill + scale-up + checkmark icon overlay (not color alone).
- Wrong: shake animation + red border + X icon overlay (not color alone — WCAG 1.4.1).

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.05ms !important;
  }
}
```

Progress bar shows instant fill (no animation). All transitions become near-instant.

### Contrast Notes

- `--kid-yellow`, `--kid-green`, `--kid-pink` are **decorative only** — never used as text on white/light backgrounds. They appear as gradient backgrounds with white text on top, or as icon fills alongside text labels.
- All text uses `--foreground` (4.5:1+ on background) or `--muted-foreground` (4.5:1+ verified).
- Dark mode: all existing oklch values already meet AA contrast — preserved unchanged.
- Quiz feedback uses both color AND icon (checkmark for correct, X for wrong) — never color alone.

## Screen-by-Screen Redesign

### Login Page

**Current:** Plain centered form.
**New:**
- Split layout on desktop: left has warm gradient (primary to kid-purple) with floating Lucide SVG icons (BookOpen, Star, Sparkles), right has form
- Mobile: form only with gradient as subtle top banner
- Form card: shadow-card + rounded-2xl
- Sign In button: full-width with scale-press on active
- Dev quick-login buttons: subtle outlined chips

### Home/Landing Page

**Current:** Basic hero + story cards.
**New:**
- Hero: larger text, warm gradient background (primary to kid-purple), tagline "Stories that teach, words that stick"
- Featured stories: horizontal scroll on mobile, grid on desktop, stagger entrance
- Story cards: hover lift + shadow-card transitions
- "How it works" section: 3 steps with Lucide icons (BookOpen → Users → GraduationCap)

### Explore Page

**Current:** Grid of story cards.
**New:**
- Rounded search/filter bar at top
- Story cards: consistent height, gradient header, hover lift
- Stagger entrance animation on load

### Parent Dashboard Root (`/dashboard`)

**Current:** Child cards grid.
**New:**
- Child cards get hover lift + shadow transitions
- "Add Child" card styled as dashed-border card with Plus icon
- Stagger entrance

### Child Dashboard (`/dashboard/[childId]`)

**Current:** Flat stats, basic cards, plain vocabulary section.
**New:**
- Stats row: colorful rounded cards with Lucide icons. Blue/BookOpen for Assigned, Amber/Play for In Progress, Green/CheckCircle for Completed.
- Reader Mode CTA: keep gradient, add subtle glow on button hover
- Story cards: hover lift + shadow, stagger entrance
- Vocabulary section: mini week calendar (7 circles for days), animated progress bar, gradient pill button

### Vocabulary Management (`/dashboard/[childId]/vocabulary`)

**Current:** Plain progress + flat pills.
**New:**
- Progress card: gradient top border (primary to kid-pink)
- Today's topic: colored left border strip
- Word pills: rounded with subtle topic-tinted backgrounds, emoji prominent
- Draft edit mode: dashed border + hover glow on editable pills
- Approve button: gradient (primary to blue-700) with shine hover

### Kid Reading Hub (`/dashboard/[childId]/read`)

**Current:** Avatar + card + stories. Plain.
**New:**
- Greeting: larger avatar (80px), big bold name, star-icon age badge
- Today's Words card: taller, wave/curved bottom on gradient, topic name + count + animated arrow
- Story cards: bigger emoji (48px), more padding, rounded-2xl, hover lifts. Color-coded status badges.
- More vertical spacing

### Vocabulary Learning (`/dashboard/[childId]/read/vocabulary/[planId]`)

**Current:** Split view but bare.
**New:**
- Word list: rounded cards with emoji left, word center, status icon right (circle → checkmark). Active word has colored left border + elevated shadow.
- Detail view: large emoji on soft circular gradient spotlight, word 5xl, pronunciation in pill badge, 64px round play button with gradient + pulse idle animation, sound wave rings while playing, brief "Great job!" after listening.
- Day selector: current day filled gradient, others outlined, today dot indicator.
- "Let's check!" button: gradient with bounce animation.

### Quick Check Quiz

**Current:** Emoji + plain buttons on bare bg.
**New:**
- Emoji on large soft colored circle. Progress as dots (filled/empty).
- Answer cards with rounded-2xl, subtle border. Hover: border primary. Correct: green + checkmark icon. Wrong: shake + red + X icon.
- Celebration: large "Great job!" + stars + warm gradient bg. CSS-only animation (no external library).
- Crossfade between questions.

### Empty States

All list screens (stories, vocabulary) show a warm illustrated empty state:
- Large SVG illustration or Lucide icon (64px)
- Bold friendly message ("No stories yet!", "No vocabulary plan yet")
- Action button when appropriate ("Explore Stories", "Create Plan")
- Uses parchment/muted background, rounded-2xl card

### Loading States

Skeleton shimmer placeholders matching the new card shadows and radius. Applied to:
- Story card grids (3 skeleton cards)
- Vocabulary word lists (5 skeleton rows)
- Plan review (skeleton day blocks)

Uses existing Tailwind `animate-pulse` on muted-colored rounded rectangles.

## Files Affected

### Modified

| File | Changes |
|------|---------|
| `src/app/globals.css` | New tokens (kid-purple, background tweak), shadow utilities, animation keyframes, stagger class |
| `src/components/ui/button.tsx` | Add hover brightness + active scale-press via Tailwind classes in variant |
| `src/components/navbar.tsx` | Updated styling to match new tokens |
| `src/app/login/page.tsx` or login form component | Split layout, gradient illustration area |
| `src/app/page.tsx` | Hero redesign, how-it-works section |
| `src/app/explore/page.tsx` | Card hover states, stagger entrance |
| `src/app/dashboard/page.tsx` | Child card hover/shadow transitions |
| `src/app/dashboard/[childId]/page.tsx` | Stats cards with icons, vocabulary calendar, animations |
| `src/app/dashboard/[childId]/vocabulary/client.tsx` | Gradient accents, colored pills, shine button |
| `src/app/dashboard/[childId]/read/page.tsx` | Larger greeting, enhanced Today's Words, card styling |
| `src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx` | Word cards, spotlight, play pulse, day selector |
| `src/components/vocabulary/word-list.tsx` | Card-style words with status icons |
| `src/components/vocabulary/word-detail.tsx` | Gradient spotlight, animated play button |
| `src/components/vocabulary/quick-check.tsx` | Circle bg, card options, confetti, dot progress, icons for feedback |
| `src/components/vocabulary/plan-review.tsx` | Colored pills, topic border |
| `src/components/vocabulary/plan-progress.tsx` | Animated progress bar, gradient accent |
| `src/components/story-card.tsx` | Hover lift, shadow transitions |
| `src/components/child-card.tsx` | Hover lift, shadow transitions |

### No New Files

All changes are modifications to existing files. No new components needed — the animated progress bar uses inline Tailwind styles.

## Non-Goals

- Admin page styling (internal tool, functional is fine)
- Story reader component redesign (`story-reader.tsx` — already has good interaction patterns)
- Child edit/create pages (`/dashboard/[childId]/edit`, `/dashboard/new`) — functional forms, not user-facing showcase
- Kid reading layout wrapper (`/dashboard/[childId]/read/layout.tsx`) — chrome only, no visual content
- New page layouts or routing changes
- Feature additions — this is purely visual/UX
- Font changes — Nunito stays
- External animation libraries — CSS-only animations
