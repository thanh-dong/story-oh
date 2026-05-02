import { db } from "./index";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { stories } from "./schema";
import {
  DEMO_STORY_TITLE,
  DEMO_STORY_SUMMARY,
  DEMO_STORY_AGE_RANGE,
  DEMO_STORY_TREE,
} from "./demo-story";

async function seedAccounts() {
  console.log("Seeding dev accounts...\n");

  const accounts = [
    { name: "Admin User", email: "admin@test.com", password: "password123", role: "admin" },
    { name: "Test User", email: "user@test.com", password: "password123", role: "user" },
  ];

  for (const account of accounts) {
    // Check if user already exists
    const result = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${account.email}`
    );

    if (result.rows.length > 0) {
      console.log(`  ✓ ${account.email} already exists`);
      continue;
    }

    // Create user via better-auth API
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: account.name,
          email: account.email,
          password: account.password,
        },
      });

      if (result?.user) {
        // Set role directly in DB
        if (account.role === "admin") {
          await db.execute(
            sql`UPDATE "user" SET role = 'admin' WHERE id = ${result.user.id}`
          );
        }
        console.log(`  ✓ Created ${account.email} (${account.role})`);
      }
    } catch (e: any) {
      console.log(`  ✗ Failed to create ${account.email}:`, e.message ?? e);
    }
  }
}

async function seedDemoStory() {
  console.log("\nSeeding demo intro story...");
  const existing = await db
    .select({ id: stories.id })
    .from(stories)
    .where(eq(stories.is_demo, true))
    .limit(1);

  const fields = {
    title: DEMO_STORY_TITLE,
    summary: DEMO_STORY_SUMMARY,
    age_range: DEMO_STORY_AGE_RANGE,
    story_tree: DEMO_STORY_TREE,
  };

  if (existing.length > 0) {
    await db.update(stories).set(fields).where(eq(stories.id, existing[0].id));
    console.log(`  ✓ Updated demo story (${existing[0].id})`);
    return;
  }

  const [inserted] = await db
    .insert(stories)
    .values({
      ...fields,
      is_demo: true,
      cover_image: null,
      created_by: null,
    })
    .returning({ id: stories.id });
  console.log(`  ✓ Created demo story (${inserted.id})`);
}

async function seed() {
  await seedAccounts();
  await seedDemoStory();
  console.log("\nDone!");
  process.exit(0);
}

seed();
