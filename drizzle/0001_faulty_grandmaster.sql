CREATE TABLE "vocabulary_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"learning_language" text NOT NULL,
	"native_language" text NOT NULL,
	"week_start_date" date NOT NULL,
	"weeks_requested" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"credits_cost" integer DEFAULT 0 NOT NULL,
	"words_total" integer DEFAULT 0 NOT NULL,
	"words_audio_ready" integer DEFAULT 0 NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"listened" boolean DEFAULT false NOT NULL,
	"quiz_correct" boolean,
	"quiz_attempts" integer DEFAULT 0 NOT NULL,
	"listened_at" timestamp with time zone,
	"quizzed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vocabulary_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"word" text NOT NULL,
	"topic" text NOT NULL,
	"day" integer NOT NULL,
	"week_number" integer NOT NULL,
	"prompt_sentence" text NOT NULL,
	"pronunciation" text NOT NULL,
	"emoji" text NOT NULL,
	"audio_url" text,
	"audio_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "idToken" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabulary_plans" ADD CONSTRAINT "vocabulary_plans_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_plans" ADD CONSTRAINT "vocabulary_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_plan_id_vocabulary_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."vocabulary_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_words" ADD CONSTRAINT "vocabulary_words_plan_id_vocabulary_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."vocabulary_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vocab_plans_child_lang_status_idx" ON "vocabulary_plans" USING btree ("child_id","learning_language","status");--> statement-breakpoint
CREATE INDEX "vocab_progress_child_plan_idx" ON "vocabulary_progress" USING btree ("child_id","plan_id");--> statement-breakpoint
CREATE INDEX "vocab_words_plan_week_day_idx" ON "vocabulary_words" USING btree ("plan_id","week_number","day");