import { defineConfig } from "drizzle-kit";

const url = (process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? "")
  .replace(/\?.*$/, "");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
