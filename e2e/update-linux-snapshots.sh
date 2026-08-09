#!/usr/bin/env bash
# Regenerates the linux visual baselines with the official Playwright image,
# so they can be produced from a mac. The servers run on the host, bound to
# all interfaces; the container only drives the browser and reaches them
# through host.docker.internal. Expects the packages and examples to be
# built, same as `bun run e2e`.
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(node -p "require('@playwright/test/package.json').version")

cleanup() {
  for p in 4179 4180 4181 4182; do
    kill "$(lsof -ti "tcp:$p" 2>/dev/null)" 2>/dev/null || true
  done
}
trap cleanup EXIT
cleanup

(cd ../examples/tanstack-start && __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=host.docker.internal \
  bun run preview -- --port 4179 --strictPort --host 0.0.0.0 >/dev/null 2>&1 &)
(cd ../examples/vue && __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=host.docker.internal \
  bun run preview -- --port 4180 --strictPort --host 0.0.0.0 >/dev/null 2>&1 &)
(cd ../examples/html && PORT=4181 bun serve.mjs >/dev/null 2>&1 &)
(PORT=4182 bun serve-fixtures.mjs >/dev/null 2>&1 &)

for p in 4179 4180 4181 4182; do
  until curl -so /dev/null "http://localhost:$p/"; do sleep 0.5; done
done

docker run --rm \
  -v "$(cd .. && pwd)":/repo -w /repo/e2e \
  -e E2E_HOST=host.docker.internal \
  "mcr.microsoft.com/playwright:v${VERSION}-jammy" \
  npx playwright test visual --update-snapshots
