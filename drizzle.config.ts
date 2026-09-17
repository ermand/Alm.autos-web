import { defineConfig } from "drizzle-kit";
import { config } from "./src/server/config.ts";

/**
 * drizzle-kit runs this file in its own process, so it goes through the same
 * config module as the app: one place that declares the variable, validates it
 * and decides that a real environment variable beats the .env file.
 *
 * It used to fall back to an empty string, which drizzle-kit accepted and then
 * failed on while connecting — an opaque "exited with code 1" that said nothing
 * about the cause.
 */
const url = config().DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set, so there is nothing to migrate.\n" +
      "Add it to .env (see .env.example) or export it for this command.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
});
