import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves photo variants from the upload directory.
 *
 * A single path segment, not a splat: the router only runs server handlers on
 * an exact match, and a splat match never counts as one.
 *
 * ~/server/media.ts is imported inside the handler rather than at module level.
 * Route modules belong to the client route tree, and a top-level import of
 * node:fs and sharp reaches the browser in development, where nothing strips
 * it. Filenames are validated in readVariant before touching the filesystem.
 *
 * In production nginx serves this directory directly and only falls back here.
 */
export const Route = createFileRoute("/media/$filename")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readVariant } = await import("~/server/media.ts");
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
