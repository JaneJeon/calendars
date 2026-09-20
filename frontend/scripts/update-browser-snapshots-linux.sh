#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
image="mcr.microsoft.com/playwright:v1.63.0-noble"

docker run --rm --ipc=host \
  -v "$repo_root:/src:ro" \
  -v "$repo_root/docs/screenshots/browser-contract:/out" \
  -w /tmp \
  "$image" \
  bash -lc 'cp -a /src /tmp/calendars-browser-contract && cd /tmp/calendars-browser-contract && HUSKY=0 npm ci && npm run test:browser:update && cp -a docs/screenshots/browser-contract/. /out/'
