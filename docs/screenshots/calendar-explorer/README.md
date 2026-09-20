# Calendar explorer review evidence

These screenshots were captured from the running Vite implementation at
`http://localhost:5173/?__scenario=busy` as implementation review evidence.
They use the development fixture only to make busy, long-text, overflow, and
responsive states deterministic; the fixture still runs through the production
parser, state model, and components and is compiled out of the production build.

- `desktop-grid.jpg`: 1280 × 900 Grid with all four event-tone families and a
  real busy-day overflow path.
- `desktop-overflow-detail.jpg`: 1280 × 900 hidden-event detail inside the
  anchored overflow popover, including its Back path.
- `mobile-list-detail-390.jpg`: 390 × 1000 List with inline event detail.
- `narrow-filter-menu-320.jpg`: 320 × 700 long dynamic venue menu with stable
  alphabetical ordering and collision handling.

These are implementation evidence, not Figma exports or design mockups.
