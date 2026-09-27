# Calendar explorer browser contract

These images are Playwright's expected screenshots for the executable visual
contracts in `frontend/e2e/calendar-explorer.visual.spec.ts` and
`frontend/e2e/today-divider.visual.spec.ts`. They are generated
from the real Vite application with production-shaped development fixtures.

The suite covers the exact combinations that the earlier manual review left
implicit: surface, viewport, input modality, and selection/search state.
Chromium exercises desktop, 390px, and 320px. WebKit repeats the critical 320px
Type pointer, keyboard-focus, and touch states. Darwin and Linux baselines are kept
separately so local macOS review and Linux CI compare like with like. Generate
Linux baselines on an x86_64 host, matching the GitHub runner. The Playwright
image's arm64 variant renders different pixels; the update script stops on an
arm64 host instead of silently replacing CI baselines with those pixels.
When a pull request's required browser job fails, a separate CI job regenerates
x86_64 snapshot candidates and uploads them as an artifact. Inspect the failed
expected/actual/diff images and the complete candidate set before copying
intentional changes into this folder. Candidate generation never changes the
required browser job's failure result.

The images are only half of the contract. The same tests assert trigger/panel
alignment, viewport containment, document width, header/Close separation,
44px rows and Close targets, zero checkbox-control/label overlap, contained
labels, pointer-open absence of a row outline, keyboard control focus, and
focus restoration.

`type-320-interaction-evidence.json` preserves one raw 320px Type capture:
trigger, panel, scroll region, row, checkbox control and label rectangles,
computed pointer/keyboard outlines, and Escape focus return. It is a reviewable
sample, while the browser suite enforces the complete matrix on each run.

The `today-divider.visual.spec.ts/` snapshots cover List with and without a
today event at 1280, 390, and 320px, plus Grid at 320px. The browser tests
also measure the date cue, divider, action focus and scroll, Grid marker,
contrast, targets, document width, and subscription URL. Direct before/after
review pairs live in `docs/screenshots/today-divider/`.

Update these images only after inspecting the full replacement set and
confirming that the corresponding product contract change is intentional.
