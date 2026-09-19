# Calendar explorer frontend

The production explorer at `https://cal.janejeon.com` is a public, read-only
React application for previewing and subscribing to the calendars served by
`cal.janejeon.dev`. It uses the verified dark Chakra theme from the durable
design contract; there is no light theme.

## Architecture

- `App.tsx` owns the explorer shell and interaction contracts: calendar
  selection, filters, month navigation, Grid/List, event disclosure, busy-day
  overflow, and subscription actions.
- `api.ts` owns TanStack Query request functions. Development requests use
  `http://localhost:8787`; production requests use
  `https://cal.janejeon.dev`.
- `calendar.ts` parses ICS with `ical.js` into one event-self and projects
  multi-day events onto `America/Los_Angeles` dates. All-day `DTEND` remains
  exclusive.
- `filters.ts` owns validated persistence, DTSM option reconciliation, and
  canonical subscription URL construction.
- `theme.ts` owns the dark semantic tokens and the verified contrast-pair
  inventory.

Chakra UI compound components provide Menu, Popover, Tabs, Checkbox,
Collapsible, Button, and CloseButton behavior. TanStack Query keys include the
options identity or exact canonical feed URL, so data from one subscription is
never shown as if it belonged to another.

## State ownership

The versioned `calendar-explorer:v1` local-storage record contains only:

- selected calendar;
- absolute `YYYY-MM` month;
- Grid or List representation;
- per-calendar filter state.

The month and representation are global explorer state. Filters belong to
their calendar. Changing calendar, month, representation, or filters clears
event selection. Open menus, disclosures, focus, request state, and errors are
ephemeral and are never persisted.

For DTSM dimensions, `null` means unrestricted, an array means an explicit
selection, and `[]` means intentionally empty. Discovery data reconciles stale
stored IDs only after it loads; a discovery outage never discards a saved
filter or blocks the default feed.

## API contract

The explorer requests:

```text
GET /dtsm-events/options.json
GET /dtsm-events.ics[?scope=all|venues=...&organizers=...&categories=...]
GET /codex-resets.ics[?types=regular,banked,scheduled,forecast]
```

Filters define both the preview population and the subscription URL. The
selected month limits only the preview. An intentionally empty filter skips
the feed request and disables Add to calendar with an accessible explanation.

## Development and verification

From the repository root:

```sh
npm run dev
npm run lint
npm run test:coverage
npm run build
```

The Vite-only `__scenario` query exercises the real parser, state model, and
components with deterministic data:

```text
?__scenario=busy
?__scenario=long
?__scenario=empty
?__scenario=options-error
?__scenario=feed-error
```

The fixture module is dynamically available only in development and is not
emitted by the production build. Visual QA covers desktop, 390 px, and 320 px;
Grid and List; menus and popovers; empty/failure states; keyboard and pointer
dismissal; focus return; coarse targets; clipping; runtime logs; and computed
contrast.
