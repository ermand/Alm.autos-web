import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { z } from "zod";

/**
 * Every environment variable the server reads, in one typed place.
 *
 * Values used to be read inline wherever they were needed, which meant the
 * default for SITE_URL lived in two files and a mistyped variable name failed
 * silently at request time rather than loudly at boot.
 *
 * Precedence: a real environment variable always beats the `.env` file.
 * `process.loadEnvFile()` fills in only what is not already set, which is the
 * behaviour a deployed box needs — Forge's environment is the truth there, and
 * a stale `.env` left in a release directory must not override it.
 *
 * Server-only: it touches the filesystem and holds secrets. Anything a
 * component needs must come through a VITE_ variable instead.
 */

function loadDotEnvFile(): void {
  // CI and the build set variables themselves and ship no .env to read.
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;

  try {
    process.loadEnvFile(file);
  } catch (error) {
    // A malformed .env is worth saying out loud; it is almost always a typo
    // that would otherwise look like a missing variable.
    throw new Error(`Could not read ${file}: ${(error as Error).message}`);
  }
}

/** Accepts the spellings people actually type. */
const booleanish = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(["1", "0", "true", "false", "yes", "no", "on", "off"]))
  .transform((value) => ["1", "true", "yes", "on"].includes(value));

/**
 * A key present with no value means "not set". People write `RESEND_API_KEY=`
 * in a .env to mean absent, and .env.example ships exactly that, so an empty
 * string has to be treated as missing rather than as an invalid value.
 */
const blankIsAbsent = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value.trim() === "" ? undefined : value;
  }, inner.optional());

const siteUrl = z
  .string()
  .trim()
  .min(1)
  .refine((value) => URL.canParse(value), {
    message: "must be a full URL, for example https://alm.autos",
  })
  // A trailing slash here produces "https://alm.autos//en" in canonical links.
  .transform((value) => value.replace(/\/$/, ""));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  /**
   * Absent is a supported state: the public site falls back to the committed
   * seed so it runs with no database at all. The admin does not.
   */
  DATABASE_URL: blankIsAbsent(z.string().trim().min(1)),

  SITE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    siteUrl.default("https://alm.autos"),
  ),

  /**
   * Uploaded photos must live outside the release directory or a deploy deletes
   * them. A relative path resolves against the working directory, so a local
   * `.uploads` works without thinking about it.
   */
  UPLOADS_DIR: z
    .string()
    .trim()
    .min(1)
    .default(".uploads")
    .transform((value) => (isAbsolute(value) ? value : resolve(process.cwd(), value))),

  RESEND_API_KEY: blankIsAbsent(z.string().trim().min(1)),
  ENQUIRY_FROM_EMAIL: blankIsAbsent(z.email()),
  ENQUIRY_NOTIFY_EMAIL: blankIsAbsent(z.email()),
});

export type ServerConfig = z.infer<typeof schema> & {
  readonly isProduction: boolean;
  /** Whether an enquiry can be emailed; both halves are needed or neither works. */
  readonly canSendEmail: boolean;
  readonly hasDatabase: boolean;
  /** Anything set as FLAG_SOMETHING. Unset means off. */
  readonly flags: Readonly<Record<string, boolean>>;
};

/**
 * Feature flags are any `FLAG_*` variable, so adding one is a deployment change
 * rather than a code change: `FLAG_NEW_THING=true` reads back as
 * `config().flags.NEW_THING`. Unset is false, so a missing variable can never
 * silently switch something on.
 */
function readFlags(source: Record<string, string | undefined>): Record<string, boolean> {
  const flags: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith("FLAG_") || value === undefined) continue;

    const parsed = booleanish.safeParse(value);
    if (!parsed.success) {
      throw new Error(`${key} must be true or false, got "${value}".`);
    }
    flags[key.slice("FLAG_".length)] = parsed.data;
  }

  return flags;
}

/** Pure, so the rules can be tested without touching the real environment. */
export function parseConfig(source: Record<string, string | undefined>): ServerConfig {
  const result = schema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment is not usable:\n${problems}\n\nSee .env.example.`);
  }

  const parsed = result.data;

  return Object.freeze({
    ...parsed,
    isProduction: parsed.NODE_ENV === "production",
    canSendEmail: Boolean(parsed.RESEND_API_KEY && parsed.ENQUIRY_FROM_EMAIL),
    hasDatabase: Boolean(parsed.DATABASE_URL),
    flags: Object.freeze(readFlags(source)),
  });
}

let cached: ServerConfig | undefined;

/**
 * Read once, at first use, so tests can set variables before it is read and a
 * bad value fails on the first request rather than on some later one.
 */
export function config(): ServerConfig {
  if (!cached) {
    loadDotEnvFile();
    cached = parseConfig(process.env);
  }
  return cached;
}

/** Tests only: forget the parsed values so the next call re-reads them. */
export function resetConfigForTests(): void {
  cached = undefined;
}
