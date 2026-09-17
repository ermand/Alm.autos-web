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

# Must match PORT in the site environment and proxy_pass in the nginx template.
APP_PORT=3000

$CREATE_RELEASE()

cd "$FORGE_RELEASE_DIRECTORY"

# The lockfile format is tied to bun's version: 1.4 writes lockfileVersion 2
# and 1.3 cannot read it, so an older bun silently ignores the lockfile and then
# fails --frozen-lockfile with "lockfile had changes". Say so plainly instead.
REQUIRED_BUN="$(cat .bun-version)"
INSTALLED_BUN="$(bun --version)"
if [ "$(printf "%s\n%s\n" "$REQUIRED_BUN" "$INSTALLED_BUN" | sort -V | head -n1)" != "$REQUIRED_BUN" ]; then
  echo "This server has bun $INSTALLED_BUN, but the lockfile needs $REQUIRED_BUN or newer."
  echo "Fix it once, over SSH:  bun upgrade"
  exit 1
fi

# No --production flag: bun installs devDependencies by default, and vite and
# drizzle-kit are both devDependencies that the lines below need. Unlike npm,
# bun's --production is a boolean, so `--production=false` is not "install
# everything", it is a usage error that stops the deploy. Setting NODE_ENV to
# production does not make bun skip devDependencies either.
bun install --frozen-lockfile

# Building here rather than shipping a CI artifact keeps the deploy to one
# mechanism. It needs roughly 2 GB free: `bun run build` is the most-reported
# Forge/Node failure on small boxes, and on a 1-2 GB VPS it can swap hard enough
# to take SSH down with it. If this box is small, build in CI instead and copy
# .output in.
bun run build

# Activate first. Forge shares .env across releases and symlinks it into each
# one, so the environment is readable either side of this line — the reason to
# put it here is the process: nothing has restarted yet, so the previous version
# is still answering requests, and a failure below aborts the script with that
# version still serving.
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
#
# supervisorctl says no more than "ERROR (spawn error)" when it cannot start the
# process, which is not enough to act on, so print what is: the daemon's own
# config — its command and working directory, where the mistake usually is —
# and the tail of its log. It covers two different failures: the spawn itself
# failing, which leaves the daemon log empty and writes the reason to
# /var/log/supervisor/supervisord.log instead; and the process starting and
# exiting inside startsecs, which leaves the reason in the daemon log.
if ! sudo supervisorctl restart "daemon-${DAEMON_ID}:*"; then
  echo
  echo "--- daemon-${DAEMON_ID} did not start. Its configuration: ---"
  sudo cat "/etc/supervisor/conf.d/daemon-${DAEMON_ID}.conf" 2>&1 || true
  echo
  echo "--- last 40 lines of its log: ---"
  sudo tail -n 40 "/home/forge/.forge/daemon-${DAEMON_ID}.log" 2>&1 || true
  echo
  echo "--- supervisor's view: ---"
  sudo supervisorctl status "daemon-${DAEMON_ID}:*" 2>&1 || true
  exit 1
fi

# Supervisor reporting a started process is not the same as the site working,
# and the gap between them is wider than it looks: srvx, which Nitro uses to
# listen, calls `this.serve().catch(() => {})`, so anything that stops it
# binding the port — most often the port already being held — is discarded
# silently and the process simply exits 0. Supervisor then retries, gives up,
# and reports BACKOFF with an empty log. Ask the app instead.
for _ in $(seq 1 15); do
  # No -L: "/" redirects to the default language, and a redirect is already
  # proof the app answered. -f fails on 4xx and 5xx only, so it stays quiet here.
  if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:${APP_PORT}/"; then
    echo "The app is answering on port ${APP_PORT}."
    exit 0
  fi
  sleep 2
done

echo "Deployed, but nothing is answering on http://127.0.0.1:${APP_PORT}/ after 30s."
echo
echo "--- is anything listening on ${APP_PORT}? ---"
ss -lntp 2>&1 | grep -E ":${APP_PORT}\\b" || echo "nothing is listening on ${APP_PORT}"
echo
echo "--- last 40 lines of the daemon log: ---"
sudo tail -n 40 "/home/forge/.forge/daemon-${DAEMON_ID}.log" 2>&1 || true
echo
echo "--- supervisor's view: ---"
sudo supervisorctl status "daemon-${DAEMON_ID}:*" 2>&1 || true
exit 1
