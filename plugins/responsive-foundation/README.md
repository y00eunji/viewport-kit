# responsive-foundation

Set up or audit a project's responsive layout foundation.

Most responsive bugs are consistency bugs, not layout bugs: `768px` in one stylesheet,
`48rem` in another, `md` in a class, and `window.innerWidth < 768` in a component. They
agree until the design changes. This skill defines the breakpoints once, derives
everything from them, and leaves behind a script that fails CI when they drift apart.

## What it installs

| File | Purpose |
|---|---|
| `assets/breakpoints.css` | `@custom-media` breakpoints + `prefers-*` / pointer capability queries, mirrored as `--bp-*` custom properties |
| `assets/breakpoints.ts` | Typed mirror with `up()` / `down()` / `between()` helpers |
| `assets/fluid-scale.css` | `clamp()` type steps and space scale, interpolated 320px → 1280px, plus `--measure` |
| `assets/use-media-query.ts` | `useSyncExternalStore` hooks: `useMediaQuery`, `useBreakpointUp/Down`, `useBreakpoint`, `usePrefersReducedMotion` |
| `assets/responsive.spec.ts` | Playwright viewport matrix with horizontal-overflow detection that names the offending elements |
| `scripts/audit-breakpoints.mjs` | Dependency-free drift audit, exit code 1 on findings |

Nothing is installed unconditionally — the skill reads the project first and skips what
the stack does not need, then reports what it left out and why.

## Supported stacks

- **Tailwind v4** — `@theme` with `--breakpoint-*`, built-in container queries
- **Tailwind v3** — `screens` exported from the config so the TS mirror can be deleted entirely
- **Plain CSS / CSS Modules / CSS-in-JS** — Lightning CSS, PostCSS, or a generated-CSS fallback
- **React** — hooks, SSR fallbacks, jsdom stubbing

## Audit script

```bash
node scripts/audit-breakpoints.mjs src
node scripts/audit-breakpoints.mjs src --tokens src/styles --quiet
```

Two checks:

1. **Hardcoded lengths in query conditions.** `@media` values fail; `@container` values
   are reported as information only — container thresholds are component-local by
   design, and failing on them turns the report into noise nobody reads.
2. **CSS/TS token drift.** Compares `@custom-media` declarations against the
   `BREAKPOINTS` object and reports mismatches as `md — css 48rem vs ts 46rem`.

Exit code `0` clean, `1` findings. Wire it up as `npm run audit:breakpoints`.

## License

MIT
