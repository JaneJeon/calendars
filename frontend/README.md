# Calendar explorer frontend

The production explorer at `https://cal.janejeon.com` is a public, read-only
React application for previewing and subscribing to the calendars served by
`cal.janejeon.dev`. It uses a verified dark Chakra theme whose contrast pairs
are exported from `theme.ts` and enforced by tests; there is no light theme.

## Architecture

- `App.tsx` is the state/data orchestrator. It owns query identity, persisted
  explorer state, context transitions, and selection clearing; it does not own
  component rendering details.
- `components/ExplorerHeader.tsx` owns calendar identity and subscription
  actions. `ExplorerFilters.tsx` owns per-calendar filter controls.
  `CalendarPanel.tsx` owns period and representation controls,
  `CalendarViews.tsx` owns Grid/List and busy-day overflow, and
  `EventDetails.tsx` owns event representations and disclosure.
- `content.ts` owns feed identity and reset-type labels; `use-media.ts` owns
  responsive observation. Component-specific interface copy stays with its
  component.
- `api.ts` owns TanStack Query request functions. Development requests use
  `http://localhost:8787`; production requests use
  `https://cal.janejeon.dev`.
- `calendar.ts` parses ICS with `ical.js` into one event-self and projects
  multi-day events onto `America/Los_Angeles` dates. All-day `DTEND` remains
  exclusive.
- `filters.ts` owns validated persistence, DTSM option reconciliation, grouped
  raw-ID selection, and canonical subscription URL construction.
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
stored IDs only after it loads. Empty discovery dimensions are treated as
unknown rather than proof that every saved ID is stale, and derived
reconciliation is never written back until the user makes a change. A
discovery outage never discards a saved filter or blocks the default feed.

The backend stores raw DSMA taxonomy rows but discovery also supplies a
semantic `filterModel`. Places use a checkbox popover with a five-child B Street
group, Central Park, and searchable other places. Types expose normalized
Events/Promotions choices plus unknown future categories. Organizer choices are
searchable and collapse duplicate source records by decoded name. Every choice
continues to persist and subscribe with raw numeric IDs.

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
?__scenario=busy        # dense day and overflow
?__scenario=long        # isolated long title/location
?__scenario=empty
?__scenario=options-error
?__scenario=feed-error
```

The fixture module is dynamically available only in development and is not
emitted by the production build. Visual QA covers desktop, 390 px, and 320 px;
Grid and List; menus and popovers; empty/failure states; keyboard and pointer
dismissal; focus return; coarse targets; clipping; runtime logs; and computed
contrast.

The checked-in [review screenshots](../docs/screenshots/calendar-explorer/README.md)
show the final implementation at desktop, 390 px, and 320 px, including busy
overflow, event detail, and long filter-menu states. They are browser captures,
not Figma artifacts.

The [DTSM filter hotfix captures](../docs/screenshots/dtsm-filter-hotfix/README.md)
use the synchronized D1 vocabulary and show grouped Places, normalized Types,
decoded Organizers, and the 320 px hierarchy.
