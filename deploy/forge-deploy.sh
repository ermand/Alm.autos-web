#!/usr/bin/env bash
# Forge deploy script. Paste into Forge > Site > Deployment.
#
# Before using this, replace DAEMON_ID below with the number Forge assigned to
# the Supervisor process. It is the one thing here that is site-specific.
#
# Three things Forge will not do for a Nitro app, each a known failure mode
# (docs/adr/0002):
#   - it never restarts the Node process, not on deploy and not on an env change;
#   - zero-downtime releases can only be enabled when the site is created;
#   - it knows nothing about the database, so migrations are ours to run.
set -euo pipefail

DAEMON_ID=12345

$CREATE_RELEASE()

cd "$FORGE_RELEASE_DIRECTORY"

# --production=false because drizzle-kit and vite are devDependencies and both
# are needed below.
bun install --frozen-lockfile --production=false

# Building here rather than shipping a CI artifact keeps the deploy to one
# mechanism. It needs roughly 2 GB free: `bun run build` is the most-reported
# Forge/Node failure on small boxes, and on a 1-2 GB VPS it can swap hard enough
# to take SSH down with it. If this box is small, build in CI instead and copy
# .output in.
bun run build

# Activate before migrating, so .env — which Forge keeps outside the release and
# links in — is certainly in place. The old Node process is still serving at
# this point, because nothing has restarted it yet, so a failure here aborts the
# script with the previous version still answering requests.
$ACTIVATE_RELEASE()

# Migrations run on every deploy and do nothing when there is nothing new.
# db:migrate refuses early, with a readable message, if the database cannot be
# reached — rather than letting drizzle-kit fail with "exited with code 1".
#
# This is safe for additive changes: a new table, a new nullable column. For a
# destructive one — dropping or renaming a column the running code still reads —
# deploy it in two steps: first a release that stops using the column, then a
# release that drops it. Otherwise the old process, which is still serving right
# now, starts erroring the moment this line lands.
bun run db:migrate

# Last, and only after everything above succeeded. Must come after
# $ACTIVATE_RELEASE so the new code is live before the process picks it up.
sudo supervisorctl restart "daemon-${DAEMON_ID}:*"
