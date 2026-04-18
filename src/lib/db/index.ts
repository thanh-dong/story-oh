import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Prefer pooler URL (PgBouncer) for serverless — falls back to direct connection
const connectionString = (
  process.env.POSTGRES_POOLER_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  ""
).replace(/\?.*$/, "");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 5,               // serverless: keep pool small
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
