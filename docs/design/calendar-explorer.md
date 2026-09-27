# Calendar explorer design contract

This is the canonical product, interaction, visual, and verification contract
for the calendar explorer. Read it before changing the frontend. It is
independent of any one implementation, but it describes the shipped product.

The reusable cross-project method is the Craft page **I need to design a
product UI before choosing components**. Repository architecture and commands
remain in `frontend/README.md`.

## Product model

The page helps someone:

1. understand which public calendar they are viewing;
2. inspect and narrow its events for a chosen period;
3. add the complete live, read-only, filtered feed to their calendar.

Event content and subscription outrank branding and decoration. The intended
character is a plainspoken, current civic utility, not generic admin software.
The verified dark theme is the only supported appearance.

Five controls have independent responsibilities:

| Control           | Changes                                             | Preserves                                    |
| ----------------- | --------------------------------------------------- | -------------------------------------------- |
| Calendar selector | Event collection                                    | Period and Grid/List representation          |
| Date navigator    | Preview period                                      | Calendar, representation, and filters        |
| Grid/List         | Representation of the same month                    | Calendar, period, and filters                |
| Filters           | Preview population and canonical subscription       | Filters are remembered per calendar          |
| Add to calendar   | External subscription to the current canonical feed | Month and representation never alter the URL |

Use **Grid/List**, not Month/Agenda. Month is a period. Grid and List are peer
representations of that period. Changing context clears event selection because
the selected projection no longer exists. Filters belong to their calendar;
period and representation are global explorer state.

Separate user-authored state from derived state. Discovery, reconciliation,
responsive defaults, fixture setup, and fallback labels may alter rendering,
but they cannot overwrite saved intent until the user changes it. Only the
selected Grid or List panel is rendered; switching representation preserves
the selected month and filters.

## Domain objects and representations

An event is a domain object, the **event-self**. Every visible item is a
projection of that same object:

```text
event-self
  ├─ compact Grid projection
  ├─ scannable List projection
  └─ one consistent detail disclosure
```

The event-self carries its UID, calendar, title, all-day or timed interval,
exclusive end, and optional description, location, categories, source URL, and
status. All-day `DTEND` remains exclusive.

Activating a projection reveals the event-self. It does not enter a new mode,
edit the event, change the period, or hide the calendar:

- wide layouts use an anchored, nonmodal popover;
- narrow List discloses detail inline beneath the row;
- narrow Grid cells represent days, so the whole event-bearing day opens List
  at that date;
- only one event is selected at once;
- calendar, period, representation, or filter changes clear selection;
- source navigation is an explicit link inside detail;
- focus restoration is consumed once and cannot fire after unrelated renders.

`+N` represents a hidden collection, not an event. It reveals the collection
first. Choosing a row resolves that projection to the event-self, with a Back
path. Narrow Grid moves to List rather than choosing an event for the user.

## Filter model

Feed-supported filters define both the preview population and canonical
subscription URL. The month remains preview-only. An intentionally empty
dimension skips the feed request and disables subscription with an accessible
explanation.

D1 stores source-faithful relational entities. Raw source vocabulary is not
automatically a usable product taxonomy. Discovery therefore keeps raw arrays
and adds a versioned semantic projection:

- B Street groups the five configured leaf venue IDs;
- Central Park remains a separate pinned place;
- Event/Event(s) and Promotion(s) become Events and Promotions;
- yearly Head West tags remain metadata, not peer event types;
- duplicate decoded organizer names become one choice with all raw IDs;
- unknown future categories remain visible;
- every semantic choice serializes sorted raw IDs, preserving URL compatibility.

For every dimension, `null` is unrestricted, an array is explicit, and `[]` is
intentionally empty. All sets unrestricted. Clearing one child while All is
active materializes every current raw ID except that child. Discovery failure
or emptiness never broadens or erases persisted intent.

## Component contracts

### Calendar selector and menus

- Current calendar identity is the trigger; do not duplicate it elsewhere.
- The trigger reads as a heading with conventional interactive bounds.
- Menus are opaque anchored overlays with stable ordering and no document
  reflow.
- Active, open, selected, primary, hover, and keyboard-focus states remain
  visually distinct.
- Compound-component indicator gutters and item text anatomy remain intact.
- Escape and outside interaction dismiss safely and return or transfer focus.

### Filter popovers and checkbox groups

- Places, Type, and Organizer use anchored Chakra Popovers with real Checkbox
  anatomy.
- On narrow layouts each panel matches its trigger's left edge and width. On
  desktop Places may be 410px and generic panels 260–390px.
- The panel is opaque, viewport-contained, collision-aware, and causes no
  layout reflow.
- The checkbox control precedes its label with a measured gap. Controls,
  labels, title, Close, divider, search, and panel bounds never overlap.
- Checked state is the filled checkbox. Pointer hover may use a quiet row
  background. Keyboard focus belongs to the checkbox control, never a full-row
  outline that intersects text or panel geometry.
- Pointer opening must not show keyboard-only focus decoration. Keyboard
  opening must show a visible control-level `:focus-visible` ring.
- Parent state is checked, unchecked, or indeterminate from its children.
- Rows and Close targets are at least 44 CSS pixels. Long labels wrap inside
  the scroll region.

### Grid, List, and subscription

- Grid days remain square-ish and keep a representative busy-day overflow.
- Mobile dots are status indicators. The whole day is the target.
- Both representations explain sparse, empty, loading, and failed results.
- One `America/Los_Angeles` calendar date drives Grid's today marker, the
  toolbar cue, the List divider, and the Today action. It is transient and never
  changes the selected preview month at midnight.
- A successfully loaded current-month List with events shows one quiet,
  full-width divider before today's date group, or between adjacent event
  dates when today has no event. It sits at the start or end if all events are
  later or earlier. It is not an event, target, filter, or count item; its thin
  rules are decorative and its date text is available to assistive technology.
  The List stack owns sequence, vertical inset, and separation between a date
  group and its boundary. Each date group's event stack owns the smaller peer
  gap between same-day cards. That peer gap is at least the event card's own
  vertical content inset. Changing a day therefore changes the date-group
  relationship, while inserting or removing an event changes only that date's
  event stack. These relationships use Chakra's spacing scale. The Today
  boundary takes its height from its label, so longer or wrapped text carries
  the neighboring date groups with it. Its text keeps the full stack gap on
  either side. An ordinary rule appears only between date groups, never after
  the last one.
  Other months, loading, failure, no-event months, and intentionally empty
  filters have no divider. Past event cards keep their normal appearance.
- The month toolbar shows `Today · <short month and day>` with the full date and
  action in its accessible name. It scrolls with the page. From another month,
  Today changes only the preview month and, in List with events, focuses and
  scrolls to the divider. In current-month List, it focuses and scrolls there
  without clearing selection. In current-month Grid or a no-event List, the
  legible date cue remains visible but the action is disabled. Load, filter
  changes, and midnight never trigger a jump.
- Add to calendar uses the exact current canonical filtered URL.
- Apple/default clients may use `webcal:`. Google and Outlook receive truthful
  copy-and-subscribe instructions. Copy remains a fallback, not the concept.

## Responsive and accessibility requirements

- Verify wide desktop, 390px, and 320px CSS viewports.
- Keep high-value content and the primary action early on mobile.
- Interactive targets are approximately 44×44 CSS pixels; rendered rectangles
  are authoritative.
- Use native roles and Chakra compound behavior for buttons, links,
  checkboxes, tabs, menus, popovers, and collapsibles.
- The visual month exposes table, row, column-header, and cell relationships.
- Keep native tab order, visible focus, truthful selected/expanded state, and
  essential behavior without hover.
- Outside dismissal leaves focus on an intentionally targeted control;
  otherwise it restores the overlay trigger.
- Long names, dates, menu items, and event text wrap or truncate intentionally
  without horizontal document overflow.

## Color and contrast

Color is a set of semantic foreground/background pairs, not a bag of swatches.
Define canvas, surface, inset, raised overlay, action, selection, focus, border,
event-category, and status roles together.

- normal text: at least 4.5:1;
- large text: at least 3:1;
- essential boundaries, icons, selection, and focus: at least 3:1 against the
  adjacent color;
- hue is never the only carrier of meaning;
- verify computed rendered states, including portals, opacity, hover, focus,
  checked, and disabled states.

`frontend/src/theme.ts` owns the semantic tokens and machine-readable contrast
pairs. `frontend/src/theme.test.ts` calculates WCAG relative luminance and
enforces the thresholds. Portaled surfaces require tokens at the document
root.

## Design history

The former screenshot matrix and incident ledger duplicated implementation
rules and retained superseded spacing requirements. The file's version history
preserves that record. The component contracts above and executable browser
checks below are the current requirements.

## Executable product contract

Behavior and geometry checks cover the meaningful surfaces at 1280, 390, and
320px, including menus, filters, Grid/List, disclosures, Today transitions,
focus, target size, overflow, and the exact subscription URL. WebKit repeats the
320px Type interaction for pointer, keyboard, and touch. These checks run
against the real Vite application and deterministic production-shaped fixtures.

The browser suite checks behavior, DOM relationships, rectangles, and computed
styles. It does not keep an image baseline for every state. The three List
captures at desktop, 390px, and 320px attach to the existing Playwright report.
They review composition at each width; executable assertions cover state changes
and relationships. No platform-specific screenshot regeneration is required.

Before completion:

1. run lint, 100% unit coverage, build, browser contract, and backend e2e;
2. inspect the three representative List renders at 1280, 390, and 320px;
3. verify the production bundle contains no fixture switches;
4. after merge, run the 320px Type geometry smoke against the exact deployed
   Worker Version URL; verify the custom domain separately from a normal
   browser because its Bot Fight Mode challenges GitHub-hosted runners.

## Behavioral references

- Chakra UI Menu, Popover, Checkbox, Tabs, Collapsible, Button, and CloseButton
  contracts;
- Floating UI anchor, size, shift, flip, and collision behavior through Chakra;
- WCAG 2.2 keyboard, focus, contrast, state, and target guidance;
- FullCalendar event identity, exclusive end, list, and overflow semantics;
- Apple menu/action and focus/selection guidance;
- Nielsen Norman visibility, user control, consistency, recognition, and
  minimalism heuristics.
