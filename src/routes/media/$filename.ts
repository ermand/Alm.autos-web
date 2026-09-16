import { createFileRoute } from "@tanstack/react-router";
import { readVariant } from "~/server/media.ts";

/**
 * Serves photo variants from the upload directory.
 *
 * A single path segment, not a splat: the router only runs server handlers on
 * an exact match, and a splat match never counts as one. Filenames are
 * validated in readVariant before touching the filesystem.
 *
 * In production nginx serves this directory directly and only falls back here;
 * the handler is what makes development and a bare `node .output` work.
 */
export const Route = createFileRoute("/media/$filename")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const bytes = await readVariant(params.filename);
        if (!bytes) return new Response("Not found", { status: 404 });

        return new Response(new Uint8Array(bytes), {
          headers: {
            "content-type": "image/webp",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
