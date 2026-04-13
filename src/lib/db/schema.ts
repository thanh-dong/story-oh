import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { StoryTree } from "@/lib/types";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

// ─── Better-Auth Tables ───

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  credits: integer("credits").notNull().default(100),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  providerId: text("providerId").notNull(),
  accountId: text("accountId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  scope: text("scope"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─── App Tables ───

export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  cover_image: text("cover_image"),
  price: real("price").notNull().default(0),
  age_range: text("age_range").notNull().default("4-8"),
  require_login: boolean("require_login").notNull().default(false),
  story_tree: jsonb("story_tree").$type<StoryTree>().notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ─── Children & Family Tables ───

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  avatar: text("avatar").notNull(),
  nativeLanguage: text("native_language").notNull().default("en"),
  learningLanguages: jsonb("learning_languages")
    .$type<string[]>()
    .notNull()
    .default(["en"]),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  dailyGoalMinutes: integer("daily_goal_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const childStories = pgTable(
  "child_stories",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" })
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.storyId] })]
);

export const userStories = pgTable(
  "user_stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    story_id: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    child_id: uuid("child_id").references(() => children.id),
    progress: jsonb("progress")
      .$type<{ current_node: string; history: string[] }>()
      .default({ current_node: "start", history: ["start"] }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  },
  (table) => [
    index("user_stories_user_story_idx").on(table.user_id, table.story_id),
    index("user_stories_user_story_child_idx").on(table.user_id, table.story_id, table.child_id),
  ]
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    balance_after: integer("balance_after").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("credit_transactions_user_id_idx").on(table.user_id)]
);

// ─── Vocabulary Tables ───

export const vocabularyPlans = pgTable(
  "vocabulary_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    learningLanguage: text("learning_language").notNull(),
    nativeLanguage: text("native_language").notNull(),
    weekStartDate: date("week_start_date").notNull(),
    weeksRequested: integer("weeks_requested").notNull(),
    status: text("status").notNull().default("draft"),
    creditsCost: integer("credits_cost").notNull().default(0),
    wordsTotal: integer("words_total").notNull().default(0),
    wordsAudioReady: integer("words_audio_ready").notNull().default(0),
    plan: jsonb("plan").$type<VocabularyPlan>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vocab_plans_child_lang_status_idx").on(
      table.childId,
      table.learningLanguage,
      table.status
    ),
  ]
);

export const vocabularyWords = pgTable(
  "vocabulary_words",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => vocabularyPlans.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    topic: text("topic").notNull(),
    day: integer("day").notNull(),
    weekNumber: integer("week_number").notNull(),
    promptSentence: text("prompt_sentence").notNull(),
    pronunciation: text("pronunciation").notNull(),
    emoji: text("emoji").notNull(),
    audioUrl: text("audio_url"),
    audioGeneratedAt: timestamp("audio_generated_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vocab_words_plan_week_day_idx").on(
      table.planId,
      table.weekNumber,
      table.day
    ),
  ]
);

export const vocabularyProgress = pgTable(
  "vocabulary_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => vocabularyPlans.id, { onDelete: "cascade" }),
    listened: boolean("listened").notNull().default(false),
    quizCorrect: boolean("quiz_correct"),
    quizAttempts: integer("quiz_attempts").notNull().default(0),
    listenedAt: timestamp("listened_at", { withTimezone: true, mode: "string" }),
    quizzedAt: timestamp("quizzed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("vocab_progress_child_plan_idx").on(table.childId, table.planId),
  ]
);
