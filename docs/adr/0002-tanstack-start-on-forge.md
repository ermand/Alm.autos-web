# TanStack Start on Laravel Forge, with hand-rolled nginx and PM2

The app is TanStack Start (SSR, TypeScript) running as a long-lived Node process
behind nginx on a Hetzner box provisioned by Laravel Forge. Forge gained
first-class Node project types in October 2025, but only for **Nuxt and
Next.js** — those get PM2, the nginx proxy and forced zero-downtime deploys
wired automatically. TanStack Start is a Nitro/Vinxi app and gets none of it, so
we own that wiring ourselves.

## Considered options

Next.js would have been the frictionless path on this host, and was rejected:
the team wants TanStack, and the routing and type-safety story is the reason
this project exists in the chosen form at all. A fully prerendered static build
served by nginx was the other serious candidate — the public site is
showcase-only and could be static — but it splits the app in two and complicates
the publish-triggers-rebuild loop for the CMS.

Laravel + Filament was rejected despite Forge being built for it: Filament would
have supplied the admin almost free, but the admin here is four screens, and it
would put a PHP runtime on the box for nothing else.

## Consequences

Things Forge will not do for us, each a known failure mode:

- **Nothing restarts the Node process** — not on deploy, not when environment
  variables change in the Forge UI. The deploy script restarts it explicitly,
  after `$ACTIVATE_RELEASE()`.
- **Zero-downtime deploys can only be enabled when the site is created.** Forge
  turns it on for every new site by default, so it is usually nothing to do —
  but retrofitting is impossible, so it is worth confirming on the first
  provision rather than discovering it later.
- **Building on the box is the most-reported Forge/Node failure**, and on a
  small VPS it can swap the machine hard enough to lose SSH. The deploy script
  builds there anyway, to keep the deploy to one mechanism, which is why the box
  is specified with the room to do it. CI builds the same commit on every push,
  so a build that cannot succeed is caught before anyone deploys it; on a small
  box, ship CI's artifact instead.
- **Renaming the site's primary domain renames its directory**, breaking
  hardcoded paths. Deploy scripts use `$FORGE_SITE_PATH` and
  `$FORGE_RELEASE_DIRECTORY`.
- **Uploads must live outside `releases/`**, in a Forge shared path, or every
  deploy deletes the client's photos.
- **Forge knows nothing about the database.** Migrations are ours to run, so the
  deploy script runs them after activating the release and before restarting the
  process — while the previous version is still serving, which makes additive
  migrations safe and destructive ones a two-deploy job.
