import { db } from "./index";
import { sql } from "drizzle-orm";
import { auth } from "../auth";

async function seed() {
  console.log("Seeding dev accounts...\n");

  const accounts = [
    { name: "Admin User", email: "admin@test.com", password: "password123", role: "admin" },
    { name: "Test User", email: "user@test.com", password: "password123", role: "user" },
  ];

  for (const account of accounts) {
    // Check if user already exists
    const [existing] = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${account.email}`
    );

    if (existing) {
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

  console.log("\nDone!");
  process.exit(0);
}

seed();
