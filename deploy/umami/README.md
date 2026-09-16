# Analytics

Umami, self-hosted at `https://alm.autos/stats`, cookieless.

The site loads its tracking script from the same origin. That is deliberate and
load-bearing: `privacy.tsx` promises that no personal data is collected and no
third-party request is made, and that promise is why there is no cookie banner.
`UmamiScript` in `src/routes/__root.tsx` throws if `VITE_UMAMI_SRC` is not a
local path, so the promise cannot be broken by a config change alone.

## Setup

1. Create its database on the Postgres that Forge already provisioned:

   ```sql
   CREATE DATABASE umami;
   ```

2. Put the compose file on the box at `/home/forge/umami/docker-compose.yml`,
   alongside an `.env`:

   ```
   UMAMI_DATABASE_URL=postgresql://forge:PASSWORD@host.docker.internal:5432/umami
   UMAMI_APP_SECRET=<openssl rand -base64 32>
   ```

3. `docker compose up -d`, then open `https://alm.autos/stats`. The default
   login is `admin` / `umami` — change it immediately, it is a public default.

4. Add the site in the Umami UI, copy the website id, and set on the site:

   ```
   VITE_UMAMI_SRC=/stats/script
   VITE_UMAMI_WEBSITE_ID=<the id>
   ```

   Both are build-time values, so the site must be rebuilt and redeployed —
   changing them in the Forge UI alone does nothing.

5. Add the nginx snippet to the site's config and reload.

## Checking it works

Load the public site, then `/stats`. A visit should appear within a few seconds.
`/admin` is excluded on purpose, so browsing the CMS will not register.

If every visitor shows the same IP, the `X-Forwarded-For` headers in the nginx
snippet are missing.
