# Plain CSS, CSS Modules, CSS-in-JS

`@custom-media` needs a build-time transform. Pick whichever the project already
has; do not add a bundler for this.

## Vite + Lightning CSS

```js
// vite.config.ts
export default {
  css: {
    transformer: 'lightningcss',
    lightningcss: { drafts: { customMedia: true } },
  },
  build: { cssMinify: 'lightningcss' },
};
```

Lightning CSS resolves `@custom-media` across the whole bundle, so the tokens
file only has to be imported once.

## PostCSS

```bash
npm i -D postcss-custom-media
```

```js
// postcss.config.js
import customMedia from 'postcss-custom-media';

export default {
  plugins: [
    customMedia({ importFrom: 'src/styles/breakpoints.css' }),
  ],
};
```

`importFrom` matters: PostCSS processes files independently, so without it a
stylesheet that does not itself declare the `@custom-media` rules gets its
queries dropped.

## Fallback: generate the CSS from the TS

No Lightning CSS and no PostCSS? Make `breakpoints.ts` the source and generate the
stylesheet in a prebuild step.

```js
// scripts/gen-breakpoints.mjs
import { writeFileSync } from 'node:fs';
import { BREAKPOINTS } from '../src/lib/breakpoints.ts';

const custom = Object.entries(BREAKPOINTS)
  .map(([k, v]) => `@custom-media --${k} (width >= ${v});`)
  .join('\n');
const vars = Object.entries(BREAKPOINTS)
  .map(([k, v]) => `  --bp-${k}: ${v};`)
  .join('\n');

writeFileSync('src/styles/breakpoints.css', `${custom}\n\n:root {\n${vars}\n}\n`);
```

```json
{ "scripts": { "prebuild": "node scripts/gen-breakpoints.mjs" } }
```

Generated file, one source of truth, and the drift check becomes moot — but the
CSS is now build output, so add it to `.gitignore` and stop editing it by hand.

## CSS Modules

Import the token stylesheet **once**, from the app entry:

```ts
// src/main.tsx
import './styles/breakpoints.css';
```

`@custom-media` is global, not module-scoped. Importing it from each `*.module.css`
re-declares every rule in every module's output — larger CSS, and a silent
inconsistency if one module imports a stale copy.

## CSS-in-JS

Compose queries from the helpers; never inline the string.

```ts
import { up, down } from '@/lib/breakpoints';

const Card = styled.div`
  padding: var(--space-s);
  @media ${up('md')} { padding: var(--space-m); }
`;
```

```ts
// Don't. This is precisely what the audit script reports.
@media (min-width: 768px) { … }
```

Runtime CSS-in-JS re-evaluates on every render. For a style that depends only on
width, a static class plus a container query is cheaper and does not re-run at
all — save the runtime cost for styles that genuinely depend on props.
