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
but they cannot overwrite saved intent until the user changes it.

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

## Failure ledger

Each row records the earliest wrong layer, the resulting rule, and the evidence
needed to prevent recurrence.

| Failure                                                      | Cause                                                                                                                                        | Contract produced                                                                                                                             | Required evidence                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Branding dominated event content                             | Decoration outranked user jobs                                                                                                               | Remove nonessential identity chrome                                                                                                           | First mobile viewport reaches useful controls/events                                               |
| Title and distant Change control duplicated identity         | Selection and identity were split                                                                                                            | One adjacent identity trigger                                                                                                                 | Name, chevron, and menu read as one unit                                                           |
| Calendar heading became a blue slab                          | Heading and selected-field semantics collapsed                                                                                               | Preserve heading geometry                                                                                                                     | Focus bounds remain conventional                                                                   |
| Menu narrower than trigger                                   | Overlay geometry did not belong to its trigger                                                                                               | Width must be derived from trigger/layout                                                                                                     | Compare trigger and panel rectangles                                                               |
| Disclosure pushed layout down                                | Menu was implemented as an accordion                                                                                                         | Floating surfaces cause zero reflow                                                                                                           | Compare coordinates before/after open                                                              |
| Controls reset one another                                   | State ownership was undefined                                                                                                                | Record independent axes and preservation                                                                                                      | Exercise every axis in sequence                                                                    |
| Month/Agenda mixed dimensions                                | Period and representation were conflated                                                                                                     | Use Grid/List for the same month                                                                                                              | Period label survives switching                                                                    |
| Filters leaked or reset by calendar                          | Collection ownership was undefined                                                                                                           | Filters are per calendar                                                                                                                      | Switch away/back with custom filters                                                               |
| Collapsed summary hid constraints                            | Visible scope contradicted hidden state                                                                                                      | Neutral scope or total active count                                                                                                           | Change every dimension, then collapse                                                              |
| Last checkbox could not be cleared                           | Valid empty state was rejected                                                                                                               | Permit and explain zero selections                                                                                                            | Clear all in Grid and List                                                                         |
| Preview and subscription diverged                            | Feed identity was split from supported filters                                                                                               | Supported filters drive both                                                                                                                  | Compare population and exact URL                                                                   |
| Add action implied one-click support everywhere              | Platform flows differ                                                                                                                        | Honest webcal/copy guidance                                                                                                                   | Exercise every platform choice                                                                     |
| Operable-looking controls were inert                         | Behavior was treated as polish                                                                                                               | Every apparent control is contractual                                                                                                         | Pointer and keyboard paths                                                                         |
| Busy overflow disappeared                                    | Fixture stopped forcing the edge                                                                                                             | Preserve a day beyond display limit                                                                                                           | `+N` visible in default fixture                                                                    |
| Mobile dots were tiny buttons                                | Indicator and target geometry were conflated                                                                                                 | Whole day is the target                                                                                                                       | Measure event-bearing days at 390/320                                                              |
| Empty state differed by view                                 | Result behavior was view-specific                                                                                                            | Grid and List share result contract                                                                                                           | Reach empty in both                                                                                |
| Dismissed content retained focus                             | Visual and keyboard state diverged                                                                                                           | Dismissal is focus-safe                                                                                                                       | Record active element after each path                                                              |
| Detail floated beside the page                               | Position belonged to page, not event                                                                                                         | Anchor detail to its projection                                                                                                               | Open near top and after scrolling                                                                  |
| Contextual detail became modal                               | Component was chosen before action meaning                                                                                                   | Derive relationship before component                                                                                                          | Surrounding calendar remains operable                                                              |
| Pale action text measured 1.81:1                             | Accent chosen without its on-color                                                                                                           | Verify semantic color pairs                                                                                                                   | Computed contrast inventory                                                                        |
| Category color had no wider system                           | Color was decorative                                                                                                                         | Theme all semantic roles together                                                                                                             | Review pairs and rendered states                                                                   |
| First portaled menu was transparent                          | Tokens were scoped below portal host                                                                                                         | Tokens exist at portal root                                                                                                                   | Inspect computed overlay background                                                                |
| Popover X looked like a stray field                          | Generic icon geometry replaced native affordance                                                                                             | Use CloseButton/CloseTrigger                                                                                                                  | Alignment, hover, focus, Escape, return                                                            |
| Fixture parser ignored canonical URL                         | Rendering bypassed feed identity                                                                                                             | Fixtures filter from the real URL first                                                                                                       | Population and URL change together                                                                 |
| 320px day target measured 41px                               | Borders/gutters consumed target geometry                                                                                                     | Measure rendered targets                                                                                                                      | ≥44px without document overflow                                                                    |
| Inline detail row was not its trigger                        | Visual and accessibility states were split                                                                                                   | Use Collapsible trigger anatomy                                                                                                               | `aria-expanded`, controls, focus return                                                            |
| Overflow Back left focus on body                             | Replaced DOM had no destination                                                                                                              | Explicit one-shot focus targets                                                                                                               | Collection → detail → Back → Escape                                                                |
| Focus restoration repeated later                             | Consumed target was retained                                                                                                                 | Clear targets after one use                                                                                                                   | Parent re-render does not steal focus                                                              |
| Empty discovery rewrote saved filters                        | Derived state was persisted as intent                                                                                                        | Persist only user changes                                                                                                                     | Reload through empty/failed discovery                                                              |
| Long-lived event expanded before month bounds                | Preview bounds came too late                                                                                                                 | Intersect before projection                                                                                                                   | Multi-century fixture remains bounded                                                              |
| Month claimed grid semantics without rows                    | Roles were applied at the surface                                                                                                            | Use truthful table structure                                                                                                                  | 1 table, 7 rows, 7 headers, 42 cells                                                               |
| Static reviews passed untested interactions                  | Appearance was mistaken for completion                                                                                                       | Interaction QA plus fresh review                                                                                                              | Logs, keyboard, focus, state, geometry                                                             |
| Invented taxonomy hid production aliases/tags                | Remote D1 was never inspected                                                                                                                | Query production before UI taxonomy                                                                                                           | SQL, Wrangler JSON, grouped IDs                                                                    |
| Menu indicators crossed option labels                        | Custom padding overwrote reserved anatomy                                                                                                    | Preserve compound geometry                                                                                                                    | Zero control/label overlap                                                                         |
| Type at 320px shipped narrow with a giant All-row ring (#39) | Places was sampled at 320px while Type/Organizer were sampled only on desktop; `_focusWithin` styled the whole row for pointer-initial focus | Cover each distinct surface at every geometry-changing viewport; pointer and keyboard focus are separate states; narrow panels match triggers | Playwright screenshots plus trigger/panel, row/control/label, focus-style, and viewport assertions |

## Executable visual denominator

A checklist of dimensions is insufficient. Coverage is the explicit combination
of surface, viewport, and state. A screenshot proves only the captured cell.

| Surface              | Desktop 1280 | Mobile 390 | Mobile 320        | Required states                                 |
| -------------------- | ------------ | ---------- | ----------------- | ----------------------------------------------- |
| Calendar menu        | Yes          | Smoke      | Smoke             | Open, selected, keyboard, dismissal             |
| Add menu             | Yes          | Smoke      | Smoke             | Open, actions, dismissal                        |
| Places               | Yes          | Yes        | Yes               | Default, partial/indeterminate, search          |
| Type                 | Yes          | Yes        | Chromium + WebKit | Pointer-open, keyboard focus, changed selection |
| Organizer            | Yes          | Yes        | Yes               | Default, search, long label                     |
| Grid/overflow/detail | Yes          | Compact    | Compact           | Busy collection, detail, Back/focus             |
| List/detail          | Yes          | Yes        | Smoke             | Inline disclosure and focus                     |

`frontend/e2e/calendar-explorer.visual.spec.ts` executes this matrix against
the real Vite application and deterministic production-shaped fixtures.
Playwright snapshots catch composition. DOM rectangle and computed-style
assertions enforce alignment, containment, target size, overlap, focus, and
document width. Both are required.

Before completion:

1. run lint, 100% unit coverage, build, browser contract, and backend e2e;
2. inspect snapshots at 1280, 390, and 320px;
3. verify the production bundle contains no fixture switches;
4. give the full replacement set to two fresh reviewers;
5. fix material findings and replace the evidence;
6. after merge, run the deployed 320px Type geometry smoke.

## Behavioral references

- Chakra UI Menu, Popover, Checkbox, Tabs, Collapsible, Button, and CloseButton
  contracts;
- Floating UI anchor, size, shift, flip, and collision behavior through Chakra;
- WCAG 2.2 keyboard, focus, contrast, state, and target guidance;
- FullCalendar event identity, exclusive end, list, and overflow semantics;
- Apple menu/action and focus/selection guidance;
- Nielsen Norman visibility, user control, consistency, recognition, and
  minimalism heuristics.
