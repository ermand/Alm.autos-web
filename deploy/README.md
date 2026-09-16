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

- Project type: **Static HTML / Nuxt.js / Next.js**, package manager **bun**.
- Select the nginx template from step 2.
- **Once only:** enable zero-downtime deploys. Retrofitting means recreating the
  site.
- Add a shared path for uploads (e.g. `/home/forge/alm-uploads`). Anything
  written inside `releases/` is deleted by the next deploy, including every photo
  the client has uploaded.

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

Copy `.env.example`. `PORT` must match `{{PORT}}` in the nginx template.
After editing any variable in the Forge UI, restart the daemon by hand.

## 6. Deploy script

Contents of `forge-deploy.sh`, with the real daemon id.

## 7. SSL

Let's Encrypt, **DNS-01** validation — it works behind a proxy and needs no
inbound port 80. Auto-renewal requires an active Forge subscription.

## 8. Before DNS

Verify the site on its free `*.on-forge.com` domain. Then drop the `alm.autos`
TTL to 300s a day ahead, switch the A record, and leave GitHub Pages serving the
old site for a week so rollback is a DNS change rather than a rebuild.

## 9. Seed

Once, after the first deploy: `bun run db:migrate && bun run db:seed`.
Seeding is idempotent and never overwrites a Vehicle that already exists.
