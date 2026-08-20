# React media query hooks

## Two legitimate uses

1. **The component tree differs.** A `<Drawer>` and a `<Sidebar>` are different
   components with different children and different focus behavior. CSS cannot
   swap one for the other.
2. **A library takes a number.** `slidesPerView`, a virtualizer's column count, a
   chart's tick density. These are props, not styles.

Anything else — hiding, reordering, resizing, restacking — is CSS. Doing it in JS
ships the markup regardless, so nothing is saved, and adds a hydration mismatch
plus a layout shift that CSS does not have.

## Why not a resize listener

```ts
// The version everyone writes first
useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', onResize);
  ...
}, []);
```

Three problems: it fires on every resize pixel and needs a debounce that then
adds its own latency; `window.innerWidth` disagrees with a `rem` breakpoint the
moment the user changes their font size; and it re-renders whether or not the
answer changed.

`matchMedia` fires only when the match result *flips*. There is nothing to
throttle, and the query string is the same one CSS uses.

## SSR

`useSyncExternalStore` takes `getServerSnapshot` as an explicit third argument,
used on the server and for the first hydration render. It is a value you choose,
not a guess.

Choose it for the **most common visitor**, not the developer's monitor. If the
product's traffic is mostly phones, `serverFallback = false` for `up('md')` is
right and desktop users pay a single corrective render. Guessing desktop because
that is where the code was written makes the majority pay for it.

If the wrong first frame is unacceptable, do not solve it with a better guess —
render the shared markup on the server and branch only after mount, or make the
branch CSS-only.

## Why one store instead of a hook per breakpoint

```ts
// Broken: a hook call in a loop.
const active = Object.keys(BREAKPOINTS).map((bp) => useMediaQuery(up(bp)));
```

Hooks must be called the same number of times in the same order on every render.
A `.map()` over a list survives only until the list length changes — and then it
fails as a corrupted-hook-order crash somewhere unrelated, which is a bad way to
learn that a breakpoint was added.

`useBreakpoint` subscribes to every `MediaQueryList` inside a single `subscribe`
function: one hook call, any number of breakpoints, evaluated widest-first so the
result is the one active step rather than the list of all matching ones.

## Testing under jsdom

jsdom has no `matchMedia`. Stub it in the test setup:

```ts
// vitest.setup.ts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

That is enough to make components render. It is **not** a responsive test: the
stub returns whatever you told it to, so it verifies the branch, not the
breakpoint.

Do not try to verify layout in jsdom. It has no layout engine — every element
reports zero width, `getBoundingClientRect()` returns zeros, and no media query
evaluates against real geometry. A jsdom "responsive test" asserts on numbers
that were never computed. Use the Playwright viewport matrix in
`assets/responsive.spec.ts`, which runs in a browser that actually does layout.
