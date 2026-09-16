/**
 * Deletes enquiries older than the retention period. Run daily from cron:
 *
 *   0 3 * * * cd /home/forge/alm.autos/current && bun run scripts/purge-enquiries.ts
 *
 * Retention is a promise made on the privacy page, so it has to actually run.
 */

import { purgeOldEnquiries } from "~/server/admin/enquiries.ts";
import { hasDatabase } from "~/server/db.ts";

if (!hasDatabase()) throw new Error("DATABASE_URL is not set.");

const deleted = await purgeOldEnquiries();
process.stdout.write(`deleted ${deleted} expired enquiries\n`);
process.exit(0);
