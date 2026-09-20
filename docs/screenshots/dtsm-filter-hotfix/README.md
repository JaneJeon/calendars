# DTSM filter hotfix review evidence

These captures come from the implemented Vite application at
`http://localhost:5173` backed by local Wrangler and the synchronized D1
catalog. The catalog matched the read-only production query envelope: 24 raw
venues, 23 raw organizers, and the five raw category rows Event, Events, Head
West 2026, Promotion, and Promotions.

- `desktop-places.png`: 1280 × 900, default B Street + Central Park selection,
  five underlying B Street venue checkboxes, and searchable other places.
- `desktop-types.png`: 1280 × 900, the semantic Events and Promotions choices;
  the yearly Head West series tag is not presented as a peer event type.
- `desktop-organizers.png`: 1280 × 900, accurately labeled, searchable
  organizers with decoded source names.
- `desktop-places-partial.png`: 1280 × 900, one B Street child cleared so the
  parent visibly renders its indeterminate state.
- `desktop-places-search.png`: 1280 × 900, a real place search narrowed to
  Sutter Medical Center.
- `mobile-places-320.png`: 320 × 1000, the expanded mobile filter disclosure and
  nested Places popover without horizontal overflow.

Browser interaction QA measured every sampled checkbox row at 44 CSS pixels,
found zero checkbox-control/label overlap at desktop and 320 px, verified the B
Street parent’s indeterminate state after changing one child, and observed no
runtime warning or error logs. The raw measurements, popover and scroll-region
rectangles, search result, dismissal/focus outcomes, and exact canonical
subscription URLs are checked in as `interaction-evidence.json`. These are
implementation captures, not Figma artifacts.
