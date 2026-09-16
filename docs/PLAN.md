# ALM Autos — build plan

Sequenced for an ASAP launch: the public site ships first, on seed data, and can
go live without the CMS existing. The CMS lands second. Nothing in phase 1 is
thrown away in phase 2 — the seed file is replaced by the same queries reading
from Postgres.

See `CONTEXT.md` for vocabulary and `docs/adr/` for the decisions behind this.

## Phase 0 — Repo and infrastructure (done, except provisioning)

Runs in parallel with phase 1; the human-blocked items are flagged.

- Branch off `main`, move the current site to `legacy/`, keep it deployable as a
  DNS-level rollback target.
- Scaffold TanStack Start + TypeScript + Tailwind, Drizzle, Vitest, Biome.
- Provision the Hetzner box via Forge as an **App Server** with PostgreSQL 17.
  Enable zero-downtime deploys **at site creation** — it cannot be added later.
- nginx template proxying to the Node port; PM2 via a Forge daemon; deploy
  script restarting it after `$ACTIVATE_RELEASE()`.
- GitHub Actions: typecheck, test, build, ship artifact.
- Shared upload path outside `releases/`, plus nightly rsync to a Storage Box.
- **[blocked on client]** registrar access — A record, Resend SPF/DKIM,
  Let's Encrypt DNS-01.

## Phase 1 — Public site (done)

- Domain types and Drizzle schema for Vehicle, Gallery, Base Rate, Tier, Season,
  Enquiry, Site Settings.
- **Quote calculation** — tier fixed by rental length, each day multiplied by its
  own Season, summed. Pure function, unit-tested first, including the
  season-boundary case (28 Aug → 5 Sep) and the no-season-matches fallback.
- Seed the 25 vehicles from `legacy/index.html`: model, year, price, one photo
  each. Transmission parsed from names where present. Fuel, body type and seats
  are absent by design — cards must render cleanly without them. All four tiers
  are seeded at the one price the old site quoted: guessing a long-stay discount
  would advertise prices the owner never agreed to.
- Image pipeline: WebP at 400/800/1600, EXIF stripped. Convert the existing
  JPEGs once in CI.
- Routes: `/{lang}/`, `/{lang}/cars`, `/{lang}/cars/{slug}`, `/{lang}/about`,
  `/{lang}/contact`, `/{lang}/privacy`. `/` redirects on Accept-Language,
  defaulting to EN.
- Fleet grid with transmission and body-type filters, degrading where specs are
  missing. Featured first, then manual order.
- Enquiry form → Postgres → Resend notification. WhatsApp deep link on every
  vehicle, pre-filled with the model and year.
- SQ/EN message catalogues, `hreflang`, `sitemap.xml`, schema.org `Car`/`Offer`.
- Redesign: warm-and-local, maroon-derived palette, existing logo.
- **[blocked on client]** vector logo; Albanian copy review; confirmation that
  the WATI subscription can be dropped.

## Phase 2 — CMS (done)

- Single-account auth: email + password, session cookie, rate-limited. No
  self-signup, no 2FA, no self-service reset. Account created by hand.
- Vehicles: list, create, edit, status, featured, manual ordering.
- Gallery: multi-upload straight from a phone, drag to reorder, first is the
  card image.
- Pricing: four base rates per vehicle; global seasons with date ranges and
  multipliers.
- Enquiries: inbox, CSV export, 12-month auto-deletion.
- Site settings: phone, WhatsApp, email, address, socials, hours.
- Slugs prefilled from model + year, editable, unique, frozen once published.
- `sitemap.xml` and `robots.txt` are server routes generated per request from
  the published fleet, so they cannot go stale.

## Phase 3 — Cutover (ready to run; needs the box and DNS)

Built and committed:

- `scripts/cutover.sh` — a 13-stage interactive wizard covering provisioning,
  the once-only Forge settings, verification on the `*.on-forge.com` domain,
  the DNS switch and the rollback path.
- Self-hosted Umami, cookieless, at `/stats` on the same origin. The app
  refuses a remote script URL, so the privacy promise cannot be broken by a
  config change. See `deploy/umami/`.
- `docs/udhezues-paneli.md` — the CMS guide for the client, in Albanian.
- Privacy policy live in both languages (shipped in phase 1).

Not done, because it needs access nobody in this repo has:

- **[blocked]** provisioning the Hetzner box and running the cutover. The
  wizard is the runbook; a human with the Forge and registrar logins runs it.

## Deliberately out of scope

Availability, reservations and payments (ADR 0001). Editable page prose. Second
admin user. Object storage. Italian.
