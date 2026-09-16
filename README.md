# ALM Autos

The website for a car rental company in Kashar, Tirana. Showcases the fleet and
turns visitors into enquiries handled over WhatsApp and phone. It does not take
bookings — see [ADR 0001](docs/adr/0001-enquiries-not-bookings.md).

TanStack Start (SSR) · TypeScript · PostgreSQL + Drizzle · Tailwind · self-hosted
on Hetzner via Laravel Forge.

## Read first

| | |
| --- | --- |
| [CONTEXT.md](CONTEXT.md) | The domain language. Start here. |
| [docs/PLAN.md](docs/PLAN.md) | What was built, in what order, and what is deliberately out of scope. |
| [docs/adr/](docs/adr/) | The two decisions a reader will otherwise wonder about. |
| [docs/udhezues-paneli.md](docs/udhezues-paneli.md) | The CMS guide for the client, in Albanian. |

## Running it

```bash
bun install
bun run images:build   # legacy photos -> .uploads (once)
bun run dev
```

Without `DATABASE_URL` the fleet falls back to the committed seed in
`src/data/fleet.seed.json`, so the public site runs with no database at all. The
admin needs one.

With a database:

```bash
export DATABASE_URL=postgres://user@127.0.0.1:5432/alm_autos
bun run db:migrate
bun run db:seed
bun run admin:create -- owner@alm.autos
```

## Checks

```bash
bun run lint
bun run typecheck
bun run test        # integration tests skip unless DATABASE_URL is set
bun run build
```

CI runs all four on every push.

## Deploying

The first deployment and the DNS cutover are an interactive wizard:

```bash
./scripts/cutover.sh
```

It walks through provisioning, the once-only Forge settings that cannot be
changed later, verification on a temporary domain, and the DNS switch with a
rollback path. Reference material lives in [deploy/](deploy/README.md).

## Things that will bite you

- **Uploads must live outside `releases/`.** Forge rotates that directory on
  every deploy; anything inside it is deleted, including the client's photos.
- **Nothing restarts the Node process.** Not a deploy, not an environment
  change. The deploy script does it explicitly.
- **`VITE_*` values are baked at build time.** Changing them in Forge alone does
  nothing until the site is rebuilt.
- **A published vehicle's slug is frozen**, because search engines point at it.
- **The analytics script must be same-origin.** The privacy page promises no
  third-party requests, and the app throws rather than let that become false.
