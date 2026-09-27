#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
image="mcr.microsoft.com/playwright:v1.63.0-noble"

host_arch=$(uname -m)
if [[ "$host_arch" != "x86_64" && "$host_arch" != "amd64" ]]; then
  echo "Linux browser baselines require an x86_64 host, matching CI. This host is $host_arch; the multi-arch image renders different pixels, and x86 emulation cannot run Chromium here." >&2
  exit 1
fi

docker run --rm --platform linux/amd64 --ipc=host \
  -v "$repo_root:/src:ro" \
  -v "$repo_root/docs/screenshots/browser-contract:/out" \
  -w /tmp \
  "$image" \
  bash -lc 'cp -a /src /tmp/calendars-browser-contract && cd /tmp/calendars-browser-contract && HUSKY=0 npm ci && npm run test:browser:update && cp -a docs/screenshots/browser-contract/. /out/'
