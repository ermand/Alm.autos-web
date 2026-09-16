import { lt } from "drizzle-orm";
import { enquiries } from "~/db/schema.ts";
import { getDb } from "~/server/db.ts";

/**
 * Enquiries are personal data and the privacy page promises they are deleted
 * after twelve months. scripts/purge-enquiries.ts runs this from cron.
 *
 * It lives apart from the admin server functions because it is a plain
 * function: exported from that module it would survive handler-stripping and
 * pull the database driver into the client bundle, which the build refuses.
 */
export const RETENTION_DAYS = 365;

export async function purgeOldEnquiries(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const deleted = await getDb()
    .delete(enquiries)
    .where(lt(enquiries.createdAt, cutoff))
    .returning({ id: enquiries.id });
  return deleted.length;
}
