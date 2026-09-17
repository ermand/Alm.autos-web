/**
 * Checks the database is reachable before a migration or a seed runs.
 *
 * drizzle-kit swallows connection errors: a wrong host, a stopped Postgres and
 * a bad password all surface as `applying migrations...` followed by
 * `exited with code 1`, which says nothing about the cause. This says it.
 */

import { Socket } from "node:net";
import { config } from "~/server/config.ts";

const TIMEOUT_MS = 2000;

function canConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

const url = config().DATABASE_URL;

if (!url) {
  process.stderr.write(
    "DATABASE_URL is not set, so there is no database to talk to.\n" +
      "Add it to .env — see .env.example.\n",
  );
  process.exit(1);
}

const parsed = new URL(url);
const host = parsed.hostname;
const port = Number(parsed.port || 5432);

if (!(await canConnect(host, port))) {
  process.stderr.write(
    `Nothing is listening on ${host}:${port}, so the database cannot be reached.\n\n` +
      "Either Postgres is not running, or DATABASE_URL in .env points somewhere stale.\n" +
      "Start one and point .env at it, for example:\n\n" +
      "  docker run -d --name alm-postgres -p 5432:5432 \\\n" +
      "    -e POSTGRES_PASSWORD=alm -e POSTGRES_DB=alm_autos postgres:17\n\n" +
      "  DATABASE_URL=postgres://postgres:alm@127.0.0.1:5432/alm_autos\n",
  );
  process.exit(1);
}

process.exit(0);
