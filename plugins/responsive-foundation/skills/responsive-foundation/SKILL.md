---
name: responsive-foundation
description: Set up or audit a project's responsive layout foundation — breakpoint tokens as a single source of truth, fluid type and space scales, container-query-first component patterns, typed matchMedia hooks, and viewport regression tests. Use this skill whenever the user starts a new frontend project, sets up styling or a design system, or mentions responsive design, breakpoints, media queries, container queries, mobile/tablet/desktop layouts, viewport sizes, fluid typography, "make this responsive", or layout that breaks at certain widths. Use it even when the user does not say the word "setup" — a request to fix a layout that breaks on mobile is a request to fix the foundation underneath it.
---

# Responsive foundation

Most responsive bugs are not layout bugs. They are consistency bugs.

`768px` lives in one stylesheet, `48rem` in another, `md` in a Tailwind class, and
`window.innerWidth < 768` in a component. All four agree today. The moment the design
changes, they disagree, and the disagreement shows up as a header that collapses one
breakpoint earlier than the nav it belongs to.

Do not fix the symptom. Remove the opportunity for the four values to drift apart:
define the breakpoints once, derive everything else, and make drift detectable by a
script instead of by a user on a tablet.

Work through the steps in order. Skipping Step 1 produces a foundation that fights the
project it was installed into.

---

## Step 1 — Read the project before writing anything

Never scaffold blind. Inspect, in this order:

- `package.json` — framework, React version, Tailwind, Playwright, PostCSS, Lightning CSS.
- `tailwind.config.{js,ts,cjs,mjs}` — v3 config, and whether `screens` is customized.
- Any `@import "tailwindcss"` in a stylesheet — that means Tailwind v4, config-free.
- `vite.config.*` / `next.config.*` / `postcss.config.*` — where CSS transforms can be added.
- Existing `*.css` / `*.scss` — the breakpoints the team *actually* uses today.
- `playwright.config.*` — whether a viewport matrix already exists.

Then run the audit script and show the user the result **before** proposing changes:

```bash
node scripts/audit-breakpoints.mjs src
```

Adopt the values the team already uses. A project standardized on `768px` should get
`--bp-md: 48rem`, not a lecture about a "correct" scale. The win is the single source of
truth, not the specific numbers — and a foundation that renames every breakpoint on day
one gets reverted on day two.

Read exactly one file from `references/`, matching the stack:

| Detected | Read |
|---|---|
| `@import "tailwindcss"` | `references/tailwind-v4.md` |
| `tailwind.config.*` (v3) | `references/tailwind-v3.md` |
| Plain CSS / CSS Modules / CSS-in-JS | `references/vanilla-css.md` |
| React hooks requested or needed | `references/react-hooks.md` |

Do not read all four. They contradict each other on purpose.

---

## Step 2 — The token layer

Copy `assets/breakpoints.css` and `assets/breakpoints.ts` into the project (typical
locations: `src/styles/breakpoints.css`, `src/lib/breakpoints.ts`).

Two rules govern this layer. Explain both to the user — each exists because of a
specific failure.

**(a) Define each breakpoint once.**

CSS custom properties do not work inside media query conditions:

```css
/* Parses fine. Never matches. Never warns. */
@media (width >= var(--bp-md)) { ... }
```

The var is substituted at computed-value time, which is long after media conditions are
evaluated. This is the worst failure mode available: silent. That is why the CSS side
uses `@custom-media` (build-time inlined) and the TS side is a mirror — and why the
audit script exists to keep the two honest. The alternative to a script is a code
review that eventually forgets.

**(b) `rem`, not `px`.**

When a user raises the browser's default font size, a `rem` breakpoint reflows the
layout in proportion — the text gets bigger and the two-column switch arrives sooner,
which is exactly what a user asking for bigger text wants. A `px` breakpoint ignores
the setting entirely and hands them large text crammed into a desktop grid.

Defaults are aligned with Tailwind's scale (40 / 48 / 64 / 80 / 96rem). Not because
Tailwind is authoritative, but because the numbers are familiar, and because adopting
or dropping Tailwind later becomes a rename instead of a redesign.

---

## Step 3 — Replace stepped values with fluid scales

Copy `assets/fluid-scale.css`.

Breakpoints exist to change the *shape* of a layout: one column becomes two, a drawer
becomes a persistent sidebar, a stack becomes a grid. Shape changes are discrete, so a
discrete trigger is right.

Font size is not a shape. Stepping it at breakpoints has two costs:

1. Every width *between* breakpoints renders at a size nobody designed. A 900px window
   gets the 768px type because that is the last step that fired.
2. Adding a breakpoint doubles the values to maintain. Each new step must be given a
   font size for every element that has one.

Interpolate instead:

```css
/* Before — three declarations, two of them wrong most of the time */
.title { font-size: 1.5rem; }
@media (width >= 48rem) { .title { font-size: 2rem; } }
@media (width >= 64rem) { .title { font-size: 2.5rem; } }

/* After — one declaration, correct at every width */
.title { font-size: var(--step-3); }
```

Steps `--step--1` through `--step-4` and `--space-2xs` through `--space-2xl` cover
almost every real design. If the user needs another step, extend using the formula
documented at the top of the file — do not invent an unrelated value.

---

## Step 4 — Container queries as the default

Do not skip this step. It is where the largest correctness gain is.

A card that appears in a 320px sidebar *and* in a full-width grid has no correct
viewport breakpoint. At 1440px the sidebar card is narrow and the grid card is wide;
one media query must be wrong for one of them. Media queries answer "how wide is the
window", and below the page shell that is the wrong question. The right one is "how
much room does this component have".

Assign the roles explicitly:

- **Media queries** — the app frame, global navigation, and `prefers-*` capability
  queries. Things that genuinely depend on the window or the device.
- **Container queries** — everything else. Every component that could be reused at a
  different width.

```css
.card-list { container-type: inline-size; container-name: card-list; }

/* The query lives on a CHILD, never on .card-list itself. */
@container card-list (width >= 30rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
```

Two practical constraints worth stating up front:

1. **An element cannot query itself.** Declaring `container-type` on `.card` and then
   writing `@container (width >= 30rem) { .card { ... } }` never matches — the query
   must target a descendant. In practice this means one extra wrapper. Plan for it
   rather than discovering it.
2. **`cqi` is `vi` scoped to the container.** `1cqi` = 1% of the container's inline
   size. Every viewport unit trick — fluid type, proportional gaps — works inside a
   container by swapping the unit.

**Prefer no query at all.** Intrinsic sizing solves the common cases without any
breakpoint, viewport or container:

```css
.grid {
  display: grid;
  gap: var(--space-m);
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
}
```

That reflows at every width, in any container, with nothing to keep in sync. The
`min(18rem, 100%)` matters: bare `minmax(18rem, 1fr)` overflows containers narrower
than 18rem.

When recommending a container query, say why the layout cannot be expressed
intrinsically. If there is no such reason, the query is unnecessary state.

---

## Step 5 — JS hooks are the escape hatch

Copy `assets/use-media-query.ts` **only** when one of these is true:

1. The **component tree itself** differs by breakpoint — a `<Drawer>` on mobile and a
   `<Sidebar>` on desktop are different components, not one component with different
   CSS.
2. A **library needs a number** — a virtualized list's item count, a chart's tick
   density, a carousel's `slidesPerView`.

Everything else is CSS.

Hiding an element with JS instead of CSS saves nothing: the markup ships either way,
the component still renders, and now there is a hydration mismatch on the server and a
layout shift on the client. `display: none` in a media query costs zero JavaScript and
cannot be wrong on first paint.

When the user asks for `useIsMobile`, do not hand it over silently. Ask what it will
gate. If the answer is "hide the sidebar", recommend CSS first and explain the two
costs above. Provide the hook if they still want it — but they should choose it
knowing what it buys.

The hook is built on `useSyncExternalStore` rather than `useState` + `useEffect`, for
three concrete reasons:

- **Nothing to throttle.** `matchMedia` fires only when the match result *flips*, not
  on every resize pixel. The debounce that a `resize` listener needs does not apply.
- **No wrong first frame.** Subscribing through the store means the correct value is
  available during the first render. The effect-based version renders the fallback,
  then corrects — a visible flash, and a wasted render.
- **The server value is explicit.** `getServerSnapshot` is an argument you pass, not a
  guess the hook makes. Pick it to match the most common visitor, not the developer's
  monitor.

---

## Step 6 — Make regressions visible

Copy `assets/responsive.spec.ts` into the Playwright test directory.

It sweeps a viewport matrix and asserts no horizontal overflow. That specific check
earns its place on three counts: horizontal overflow is the most common responsive
defect, `scrollWidth > clientWidth` detects it without ambiguity or a screenshot
baseline, and it is invisible on the wide monitor where the code was written. Highest
automation value per line of test.

The spec reports the *culprit elements*, not just a boolean — a failing test that says
`overflows by 42px` and nothing else gets skipped rather than fixed.

Wire the audit into `package.json`:

```json
{
  "scripts": {
    "audit:breakpoints": "node scripts/audit-breakpoints.mjs src",
    "test:responsive": "playwright test responsive.spec.ts"
  }
}
```

`audit:breakpoints` exits `1` on findings, so it drops into CI unchanged.

---

## Verify before reporting done

1. **Build passes and `@custom-media` is inlined.** Grep the built CSS for
   `@custom-media` — if it survives to the output, the transform is not configured and
   every query silently does nothing.
2. **The audit runs clean**, or every remaining finding was shown to the user with a
   reason for keeping it.
3. **The TS and CSS tokens agree** — the audit's drift check passes.
4. **The Playwright matrix passes at the narrowest viewport** (320px). If only that one
   fails, the fix is a `min-width` or a missing `min-width: 0` on a grid child.
5. **Fluid steps are actually used.** If `--step-*` is defined but nothing references
   it, Step 3 was installed but not adopted; finish the replacement or drop the file.

Finally, tell the user what you **left out and why**: no hooks because CSS covered it,
no container queries because there is one layout context, no Playwright matrix because
the project has no test runner yet. An unexplained absence reads as an oversight, and
someone adds it back next week without knowing it was a decision.
