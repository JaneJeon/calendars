# Today divider review captures

These are full-page Chromium captures from the real Vite app with its existing
`__scenario=busy` fixture. Before images use `origin/master` at `c822a77`;
after images use the issue #43 implementation. The browser clock is fixed in
`America/Los_Angeles`, and each before/after pair has the same viewport, date,
fixture, and representation.

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
text contrast, toolbar target height, document width, scroll and visible focus
after Today, Grid's marker through midnight, runtime errors, and the unchanged
exact subscription URL. Each screenshot
shows only its stated viewport and state.
