# Deploying to Hetzner via Laravel Forge

Read `docs/adr/0002-tanstack-start-on-forge.md` first. Forge gained first-class
Node support in October 2025 for **Nuxt and Next.js only**; this is a Nitro app,
so nginx and the process manager are ours to wire.

Decisions that cannot be changed after the fact are marked **once only**.

## 1. Server

- Create an **App Server** (a Web Server cannot host a database).
- PostgreSQL 17. Keep the `forge` database password shown at provision — it is
  shown once.
- At least 4 GB RAM. Builds run in CI, but Postgres, Node and nginx share the box.

## 2. Nginx template

Server → Nginx Templates → new template, contents of `nginx.conf.template`.
Template edits do not propagate to sites already created, so this must exist
before the site does.

## 3. Site

- Project type: **Other**. Not Nuxt.js and not Next.js: those two types make
  Forge drive the build and the process for you, and this app is neither — it is
  a Nitro app that happens to produce the same `.output` layout as Nuxt. Picking
  one of them bets on undocumented behaviour matching ours. **Other** leaves
  nginx, the process and the deploy script to us, which is what everything in
  this directory is written for.
- Package manager: **bun**, if the option is offered. Verify afterwards with
  `which bun` over SSH — the deploy script uses it, and Forge installs Node by
  default, not bun.
- Select the nginx template from step 2.
- Leave **zero-downtime deploys** on. Forge enables it for every new site by
  default, so this is usually nothing to do — but check, because it is
  **creation-time only** and retrofitting means recreating the site.
- **Root directory: `/`.** `package.json` is at the repository root.
- **Web directory: `/.output/public`.** Not `/public`, which is Forge's default
  and is the source directory rather than the built one. Forge's `{{PATH}}`
  variable is the site root plus this value, and the nginx template uses it as
  its `root`, so this is what points nginx at the built static files. The
  directory does not exist until the first build; nginx falls through to the app
  until it does.
- **Shared paths: none.** Forge shares `.env` automatically, which is the only
  thing that needs to appear inside each release. Uploads do not: `UPLOADS_DIR`
  is an absolute path outside the release and nginx aliases `/media/` straight
  at it, so there is nothing to link in. The app creates the directory itself on
  first upload.
- **Website isolation: off.** With it on, the site runs as its own user, which
  changes the Supervisor user in step 4 and the `sudo supervisorctl` permissions
  the deploy script needs.
- **Push to deploy: on** is fine, but note it now runs migrations too — every
  push to the deployed branch migrates the production database.

## 4. Process

Site → Background Processes (Supervisor):

| Field | Value |
| --- | --- |
| Command | `node .output/server/index.mjs` |
| Directory | the site's `current` path |
| User | `forge` |
| Processes | 1 |

Note the daemon id Forge assigns and put it in the deploy script's
`supervisorctl restart daemon-<id>:*` line. Nothing restarts the process
otherwise — not a deploy, not an environment variable change.

## 5. Environment

Copy `.env.example` into Forge's Environment tab. `PORT` must match
`{{PORT}}` in the nginx template.

Forge writes these as a real `.env` in the site root, and
`src/server/config.ts` validates them at boot — a bad value stops the process
with a message naming it, rather than failing on some later request. Values
already present in the process environment win over the file, so Forge stays
the source of truth.

After editing any variable in the Forge UI, restart the daemon by hand. Nothing
restarts the Node process for you.

## 6. Deploy script

Contents of `forge-deploy.sh`, with `DAEMON_ID` set to the number from step 4.
That is the only edit it needs.

It installs, builds, activates the release, **runs migrations**, and only then
restarts the process. Forge knows nothing about the database, so migrations are
ours to run and they run on every deploy — doing nothing when there is nothing
new.

Two things to know before a deploy that changes the schema:

- Migrations run while the **previous** version is still serving, so additive
  changes are safe and destructive ones are not. Dropping or renaming a column
  the running code still reads needs two deploys: one that stops using it, then
  one that drops it.
- The build happens on the box and wants roughly 2 GB free. On a small VPS
  `bun run build` is the most-reported Forge/Node failure and can swap the
  machine hard enough to lose SSH. If the box is small, build in CI and copy
  `.output` in instead.

## 7. SSL

Let's Encrypt, **DNS-01** validation — it works behind a proxy and needs no
inbound port 80. Auto-renewal requires an active Forge subscription.

## 8. Before DNS

Verify the site on its free `*.on-forge.com` domain. Then drop the `alm.autos`
TTL to 300s a day ahead, switch the A record, and leave GitHub Pages serving the
old site for a week so rollback is a DNS change rather than a rebuild.

## 9. First run

The deploy script already migrated the database, so what is left is the data
that only needs creating once. From the site's `current` directory:

```bash
bun run images:build        # legacy photos -> UPLOADS_DIR (idempotent, never clears)
bun run db:seed             # 25 vehicles; never overwrites one that exists
bun run admin:create -- owner@alm.autos
```

`images:build` writes into the shared uploads path, not into the release, so it
survives every later deploy and never needs running again.

`admin:create` reads the password from stdin so it stays out of shell history,
and re-running it resets the password — that is the reset flow, deliberately.

## 10. Cron

Retention is a promise the privacy page makes, so it has to actually run:

```
0 3 * * * cd /home/forge/alm.autos/current && bun run db:purge-enquiries
```
