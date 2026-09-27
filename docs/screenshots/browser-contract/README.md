# Calendar explorer browser contract

These images are Playwright's expected screenshots for the executable visual
contract in `frontend/e2e/calendar-explorer.visual.spec.ts`. They are generated
from the real Vite application with production-shaped development fixtures.

The suite covers the exact combinations that the earlier manual review left
implicit: surface, viewport, input modality, and selection/search state.
Chromium exercises desktop, 390px, and 320px. WebKit repeats the critical 320px
Type pointer, keyboard-focus, and touch states. Darwin and Linux baselines are kept
separately so local macOS review and Linux CI compare like with like.

The images are only half of the contract. The same tests assert trigger/panel
alignment, viewport containment, document width, header/Close separation,
44px rows and Close targets, zero checkbox-control/label overlap, contained
labels, pointer-open absence of a row outline, keyboard control focus, and
focus restoration.

`type-320-interaction-evidence.json` preserves one raw 320px Type capture:
trigger, panel, scroll region, row, checkbox control and label rectangles,
computed pointer/keyboard outlines, and Escape focus return. It is a reviewable
sample, while the browser suite enforces the complete matrix on each run.

Update these images only after inspecting the full replacement set and
confirming that the corresponding product contract change is intentional.
