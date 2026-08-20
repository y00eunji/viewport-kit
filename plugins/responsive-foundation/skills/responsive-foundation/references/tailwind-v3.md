# Tailwind CSS v3

## Export `screens` — then delete `breakpoints.ts`

v3 keeps breakpoints in the JS config, which means JS can import them directly.
That makes the TS mirror unnecessary: instead of auditing two files for drift,
there is one file and nothing to drift.

```js
// tailwind.config.js
export const screens = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
};

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: { screens },
};
```

```ts
// src/lib/breakpoints.ts — now just derived helpers
import { screens } from '../../tailwind.config';

export type Breakpoint = keyof typeof screens;
export const up = (bp: Breakpoint) => `(width >= ${screens[bp]})`;
export const down = (bp: Breakpoint) => `(width < ${screens[bp]})`;
```

Prefer this to copying `assets/breakpoints.ts`. Elimination beats verification —
the audit's drift check exists because two sources of truth are unavoidable in
plain CSS, not because two sources are good.

Note the config is now ESM-ish; if the project uses `module.exports`, use
`exports.screens = screens` and `require` it from a CJS-friendly entry.

## Container queries need the plugin

```bash
npm i -D @tailwindcss/container-queries
```

```js
plugins: [require('@tailwindcss/container-queries')],
```

Then `@container` / `@md:` work as in v4. Without the plugin those classes emit
nothing at all — silently, with no build error.

## px → rem is a breaking change

Tailwind v3 ships `px` screens by default (`768px`). Switching to `48rem` changes
the layout for every user who is not at a 16px root font size — which is the
entire point, but it is still a visible change to an existing product.

Say so before doing it. Give the user the choice:

- **Switch to rem** — correct for users who scale their font size; requires a
  visual pass at the affected widths.
- **Keep px** — no change today; the accessibility gap stays open.

Either is defensible. Making the change quietly is not.
