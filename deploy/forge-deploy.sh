#!/usr/bin/env bash
# Forge deploy script. Paste into Forge > Site > Deployment.
#
# Three things Forge will not do for a Nitro app, each a known failure mode
# (docs/adr/0002):
#   - it never restarts the Node process, not on deploy and not on an env change;
#   - zero-downtime releases can only be enabled when the site is created;
#   - building here can OOM a small box, so CI builds and we only install.
set -euo pipefail

$CREATE_RELEASE()

cd "$FORGE_RELEASE_DIRECTORY"

bun install --frozen-lockfile --production=false
bun run build

$ACTIVATE_RELEASE()

# Replace 12345 with the daemon id Forge assigns. Must come after
# $ACTIVATE_RELEASE so the new code is live before the process restarts.
sudo supervisorctl restart daemon-12345:*
