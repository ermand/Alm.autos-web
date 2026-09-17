import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/db/schema.ts";
import { config } from "./config.ts";

/**
 * Lazy Postgres client. Absent DATABASE_URL is a supported state during phase 1:
 * the fleet falls back to the committed seed. Every other consumer must call
 * hasDatabase() first.
 */

let client: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function hasDatabase(): boolean {
  return config().hasDatabase;
}

export function getDb() {
  const url = config().DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Call hasDatabase() before getDb().");
  }
  if (!db) {
    client = postgres(url, { max: 10 });
    db = drizzle(client, { schema });
  }
  return db;
}
