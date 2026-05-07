import { Pool } from "pg";
import { readFileSync } from "fs";

// Load .env.local manually
const env = readFileSync("/Volumes/ExDrive/_sources/story-oh/.env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"\n]+?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const connectionString = (
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  ""
).replace(/\?.*$/, "");

if (!connectionString) {
  console.error("No DB URL found");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 15000,
});

const sql = `
CREATE TABLE IF NOT EXISTS "generation_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "free_regens_remaining" integer NOT NULL DEFAULT 2,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "generation_sessions_user_id_idx"
  ON "generation_sessions" ("user_id");
`;

try {
  console.log("Connecting...");
  const client = await pool.connect();
  console.log("Connected. Running migration...");
  await client.query(sql);
  console.log("Migration applied successfully.");

  const check = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generation_sessions' ORDER BY ordinal_position"
  );
  console.log("Table columns:");
  for (const row of check.rows) console.log(`  ${row.column_name}: ${row.data_type}`);
  client.release();
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
