# Deploying to Hetzner via Laravel Forge

Read `docs/adr/0002-tanstack-start-on-forge.md` first. Forge gained first-class
Node support in October 2025 for **Nuxt and Next.js only**; this is a Nitro app,
so nginx and the process manager are ours to wire.

Decisions that cannot be changed after the fact are marked **once only**.

## 1. Server

- Create an **App Server** (a Web Server cannot host a database).
- PostgreSQL 17. Keep the `forge` database password shown at provision — it is
  shown once.
- At least 4 GB RAM. The deploy builds on the box, and Postgres, Node and nginx
  share it.

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
- Package manager: **bun**, if the option is offered. Afterwards, over SSH:

  ```bash
  bun --version     # must be >= the version in .bun-version
  bun upgrade        # if it is older
  ```

  The lockfile format is tied to bun's version — 1.4 writes `lockfileVersion 2`
  and 1.3 cannot read it, so an older bun ignores the lockfile and then fails
  `--frozen-lockfile` with "lockfile had changes". The deploy script checks this
  first and tells you what to run, rather than letting the install fail.
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
| Command | `node /home/forge/<site>/current/.output/server/index.mjs` |
| Directory | `/home/forge/<site>/current` |
| User | `forge` |
| Processes | 1 |

**Give the command an absolute path.** A relative `node .output/server/index.mjs`
is resolved against the process's working directory, so it depends on the
`directory` above being right *and* on `current` pointing where you think it
does. When it does not, Node reports a path you never typed — typically
`releases/000000/.output/server/index.mjs`, Forge's placeholder release from
before the first deploy — and Supervisor answers `ERROR (spawn error)`, which
says nothing about why. An absolute path resolves the symlink at load time and
takes the working directory out of the question entirely.

**The directory is still the release root, not `.output`.** With an absolute
command it no longer decides which file runs, but it is the process's working
directory, and that is where the app looks for `.env` — Forge links the shared
one into each release root.

`ERROR (spawn error)` is all `supervisorctl` will tell you, and it covers two
different failures: the spawn genuinely failing, and the process starting and
exiting within `startsecs`. The reason is in `/home/forge/.forge/daemon-<id>.log`
— `couldn't chdir ... ENOENT` for the first (the directory does not exist, which
it will not until the first successful build), a crash for the second. The
deploy script prints both the config and the log tail when the restart fails.

Configuration used to break here too — the app read `.env` only from its working
directory, so a process started in `.output` found none, lost `DATABASE_URL`,
and quietly served the committed seed. It now also looks one and two levels up,
so a wrong directory is a loud failure rather than a silent one.

Note the daemon id Forge assigns and put it in the deploy script's
`supervisorctl restart daemon-<id>:*` line. Nothing restarts the process
otherwise — not a deploy, not an environment variable change.

## 5. Environment

Copy `.env.example` into Forge's Environment tab.

Three that are easy to leave out, in the order they bite:

- **`DATABASE_URL`** — without it the deploy fails at the migration step, the
  admin refuses to run, and the public site serves the committed seed instead of
  your data. Forge shows the `forge` user's password once at provisioning:
  `postgres://forge:PASSWORD@127.0.0.1:5432/forge`.
- **`PORT`** — the app defaults to 3000 and the nginx template proxies to 3000,
  so leaving it out happens to work. Set it anyway, so the two agree by saying
  so rather than by coincidence. It is **not** `{{PORT}}`: that Forge variable
  is the port nginx listens on, not the application's.
- **`NODE_ENV=production`** — no longer load-bearing for the session cookie,
  which now follows the scheme in `SITE_URL`, but it is what the rest of the
  Node ecosystem reads.

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
