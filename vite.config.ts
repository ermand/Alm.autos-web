import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import { isSafeVariantFilename } from "./src/domain/photos.ts";

/**
 * Serves uploaded photos in development.
 *
 * Vite's dev server treats any path with a file extension as a static asset, so
 * `/media/audi-q5-2012-1-800.webp` is answered by its own 404 before SSR runs
 * and the route's server handler never fires. Production has no such
 * middleware, which is why this only ever broke in development.
 *
 * In production nginx serves the same directory directly. This middleware is
 * the development equivalent, so both environments behave the same way and the
 * route handler stays the fallback in each.
 */
function uploadsDevServer(): Plugin {
  return {
    name: "alm-uploads-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/media", (req, res, next) => {
        const filename = decodeURIComponent((req.url ?? "").split("?")[0] ?? "").replace(/^\//, "");

        // Same rule the server route applies: the name comes from a URL and is
        // about to be joined to a filesystem path.
        if (!isSafeVariantFilename(filename)) {
          next();
          return;
        }

        const configured = process.env.UPLOADS_DIR;
        const dir = configured
          ? isAbsolute(configured)
            ? configured
            : resolve(process.cwd(), configured)
          : resolve(process.cwd(), ".uploads");

        const file = resolve(dir, filename);

        stat(file)
          .then(() => {
            res.setHeader("content-type", "image/webp");
            res.setHeader("cache-control", "no-cache");
            createReadStream(file).pipe(res);
          })
          .catch(() => next());
      });
    },
  };
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    uploadsDevServer(),
    nitro(),
    tailwindcss(),
    tanstackStart({
      /**
       * Keep server-only packages out of the browser.
       *
       * Server function bodies are compiled away for the client, but their
       * modules keep their top-level imports in development, where nothing
       * tree-shakes. That dragged the Postgres driver into the browser and it
       * failed on load with "Buffer is not defined". Naming the packages here
       * makes the client build mock them instead.
       *
       * Specifiers, not files: src/server also holds the server functions that
       * components legitimately import as RPC stubs, and mocking those modules
       * wholesale would break every form.
       */
      importProtection: {
        client: {
          specifiers: ["postgres", "sharp", /^drizzle-orm(\/|$)/, /^node:(fs|crypto)/],
        },
      },
    }),
    viteReact(),
  ],
});
