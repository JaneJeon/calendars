# Today divider review captures

These Chromium captures come from the real Vite app with its existing
`__scenario=busy` fixture. Before images use `origin/master` at `c822a77`;
after images use the issue #43 implementation. Each pair shares the viewport,
Los Angeles clock date, fixture, and representation.

## The changed boundary first

The focused captures scroll the Sep 19 row to the same 60px position. Their
250px viewport shows the ordinary separator above it, the Today boundary, and
the next event card together. The full adjacent card remains visible.

| State                         | Before                                        | After                                       |
| ----------------------------- | --------------------------------------------- | ------------------------------------------- |
| No event today, 320px, Sep 20 | [Before](boundary-before-no-today-320.png)    | [After](boundary-after-no-today-320.png)    |
| Event today, 390px, Sep 26    | [Before](boundary-before-today-event-390.png) | [After](boundary-after-today-event-390.png) |

## Full-page context

| State                                | Before                                    | After                                   |
| ------------------------------------ | ----------------------------------------- | --------------------------------------- |
| List, no event today, 1280px, Sep 20 | [Before](before-list-no-today-1280.png)   | [After](after-list-no-today-1280.png)   |
| List, no event today, 390px, Sep 20  | [Before](before-list-no-today-390.png)    | [After](after-list-no-today-390.png)    |
| List, no event today, 320px, Sep 20  | [Before](before-list-no-today-320.png)    | [After](after-list-no-today-320.png)    |
| List, event today, 390px, Sep 26     | [Before](before-list-today-event-390.png) | [After](after-list-today-event-390.png) |
| Grid, 320px, Sep 26                  | [Before](before-grid-today-320.png)       | [After](after-grid-today-320.png)       |

The executable browser contract in
`frontend/e2e/today-divider.visual.spec.ts` also captures List with and without
a today event at 1280, 390, and 320px, plus Grid at 320px, on Darwin and Linux.
Its DOM and computed-style assertions check divider placement, visible date,
text contrast, the single 8px rhythm from panel edges through same-day cards
and ordinary rules plus clearance around the Today text, toolbar target height, document width, Today
scroll and focus, Grid's marker through midnight, runtime errors, and the exact
subscription URL. Each screenshot shows only its stated viewport and state.
