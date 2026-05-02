import type { StoryTree } from "@/lib/types";

/**
 * Placeholder content for the onboarding demo story. This is a tiny but
 * functional story tree used as scaffolding — replace `text` and choice
 * `label` fields with the final hand-authored copy before launch.
 */
export const DEMO_STORY_TITLE = "Welcome to Story-Oh!";
export const DEMO_STORY_SUMMARY =
  "A short walkthrough disguised as a story. Tap a choice to keep going.";
export const DEMO_STORY_AGE_RANGE = "4-8";

export const DEMO_STORY_TREE: StoryTree = {
  start: {
    text: "Hello! I'm your guide. Story-Oh lets you create choose-your-own-adventure tales for kids. Want a quick tour, or to dive in?",
    choices: [
      { label: "Show me how it works", next: "tour" },
      { label: "I'll explore on my own", next: "freeplay" },
    ],
  },
  tour: {
    text: "Every story is a tree of nodes. Each node has some text and a few choices. The choices branch the story — so the same starting point can lead to many different endings.",
    choices: [
      { label: "Tell me about choices", next: "choices" },
      { label: "How do I make one?", next: "make" },
    ],
  },
  choices: {
    text: "Choices are how the reader steers the story. Some lead to new adventures, some teach a small lesson, and some loop back to give a second chance. You decide.",
    choices: [{ label: "Got it — how do I make one?", next: "make" }],
  },
  make: {
    text: "Click 'Create Story' on the dashboard. Type a keyword (like 'space pirate' or 'shy turtle'), pick an age range, and Story-Oh drafts the tree for you. You can edit any node afterwards.",
    choices: [{ label: "Sounds great — let's go!", next: "ending" }],
  },
  freeplay: {
    text: "No pressure. Click around, read a featured story, then come back here whenever you want the tour.",
    choices: [{ label: "Start exploring", next: "ending" }],
  },
  ending: {
    text: "That's the whole tour. Have fun creating! ✨",
    choices: [],
  },
};
