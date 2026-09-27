# Calendar explorer frontend

The production explorer at `https://cal.janejeon.com` is a public, read-only
React application for previewing and subscribing to the calendars served by
`cal.janejeon.dev`. It uses a verified dark Chakra theme whose contrast pairs
are exported from `theme.ts` and enforced by tests; there is no light theme.

The canonical product, interaction, responsive, accessibility, visual, and
verification contract is [`docs/design/calendar-explorer.md`](../docs/design/calendar-explorer.md).
Read it before changing the interface. The browser contract below makes its
surface × viewport × interaction-state denominator executable.

## Architecture

- `App.tsx` is the state/data orchestrator. It owns query identity, persisted
  explorer state, context transitions, and selection clearing; it does not own
  component rendering details.
- `components/ExplorerHeader.tsx` owns calendar identity and subscription
  actions. `ExplorerFilters.tsx` owns per-calendar filter controls.
  `CalendarPanel.tsx` owns period and representation controls,
  `CalendarViews.tsx` owns Grid/List, their single date-group boundary and List
  date-group and event-stack spacing, and busy-day overflow. `EventDetails.tsx` owns event
  representations and disclosure.
- `content.ts` owns feed identity and reset-type labels; `use-media.ts` owns
  responsive observation. Component-specific interface copy stays with its
  component.
- `api.ts` owns TanStack Query request functions. Development requests use
  `http://localhost:8787`; production requests use
  `https://cal.janejeon.dev`.
- `calendar.ts` parses ICS with `ical.js` into one event-self and projects
  multi-day events onto `America/Los_Angeles` dates. All-day `DTEND` remains
  exclusive.
- `use-today.ts` keeps one transient LA calendar date for the toolbar, List
  divider, Grid marker, and Today action, refreshing at the next LA date and
  when the tab resumes.
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
npm run test:browser
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

`test:browser` runs Playwright against the real Vite application and those
production-shaped fixtures. Chromium covers the complete surface matrix;
WebKit repeats the critical 320 px Type popover with mouse, keyboard, and
iPhone-style touch input. The tests assert behavior and rendered geometry:
alignment, containment, target size, text clearance, grouping, pointer versus
keyboard focus, dismissal, focus return, and canonical subscription URLs.
List spacing is owned by nested Stacks: the outer sequence owns date-boundary
clearance and panel edges, and each date owns its event gap. Theme spacing roles
map these relationships to Chakra's scale. Today text sizes naturally in flow.

`npm run test:browser` also generates four representative composition captures
in `test-results/` and attaches them to `playwright-report/`. Open the report
with `npx playwright show-report frontend/playwright-report` from the repo root.
CI uploads the report and diagnostics for every run. Review affected captures
against the product intent, not just against the old picture. There are no
committed pixel baselines, platform-specific regeneration steps, or duplicate
review galleries. The [design contract](../docs/design/calendar-explorer.md#verification)
states the claims and limits of these checks.

The post-deploy browser smoke uses the immutable Version URL of the active
frontend Worker. GitHub-hosted runners receive HTTP 403 from the production
custom domain's Bot Fight Mode, so the Worker enables version URLs while its
stable workers.dev route stays disabled. Version URLs are public. The smoke
checks the exact deployed assets and live discovery, adjusting only the
backend CORS response for the Version URL's different origin. It does not
assert that the custom domain's zone settings allow CI traffic.

Historical screenshot galleries remain available in Git history; see
[browser evidence](../docs/screenshots/README.md).
