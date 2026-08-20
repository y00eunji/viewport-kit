# Tailwind CSS v4

v4 has no JS config. Breakpoints are CSS variables in a `@theme` block, and every
utility variant is generated from them.

## Define once, in `@theme`

```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;
}
```

Each `--breakpoint-*` generates its variants automatically:

- `md:` — at or above 48rem
- `max-md:` — below 48rem (exclusive, so `md:` and `max-md:` never both apply)
- `md:max-xl:` — the 48rem–80rem band

There is no separate list of variants to maintain. Renaming a breakpoint renames
its variants; deleting one deletes them.

Remove a default with `initial`, not by omitting it — defaults are merged in:

```css
@theme {
  --breakpoint-2xl: initial;  /* the 2xl: variant now does not exist */
}
```

Clear the whole scale before defining your own with `--breakpoint-*: initial;`.

## Put the fluid scale in `@theme` too

Do not keep fluid values in a separate stylesheet. In `@theme` they become
utilities (`text-step-2`, `p-space-m`) and stay in the same place as everything
else:

```css
@theme {
  --text-step-0: clamp(1rem, 0.9583rem + 0.2083vw, 1.125rem);
  --text-step-1: clamp(1.2rem, 1.1313rem + 0.3438vw, 1.4063rem);
  --spacing-space-m: clamp(1.5rem, 1.4375rem + 0.3125vw, 1.6875rem);
}
```

## Container queries are built in

No plugin needed in v4.

```html
<div class="@container/card">
  <div class="grid @md/card:grid-cols-[8rem_1fr]">…</div>
</div>
```

The named form (`@container/card` + `@md/card:`) is worth the extra characters as
soon as containers nest — an unnamed `@md:` binds to the nearest container, which
changes meaning when someone wraps the component.

Custom container sizes come from `--container-*`:

```css
@theme {
  --container-card: 30rem;   /* enables @card/… variants */
}
```

## Arbitrary variants are the drift

```html
<!-- This is exactly what the audit script reports -->
<div class="min-[737px]:flex">
```

An arbitrary variant is a breakpoint that exists in one file, invisible to the
theme and to every other component. When one appears, either the value belongs in
`@theme` as a real breakpoint, or the layout wanted a container query.
