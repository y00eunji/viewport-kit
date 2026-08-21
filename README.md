# viewport-kit

Frontend engineering skills for [Claude Code](https://claude.com/claude-code).

## Install

```
/plugin marketplace add y00eunji/viewport-kit
```

```
/plugin install responsive-foundation@viewport-kit
```

Updates are not automatic — run `/plugin marketplace update viewport-kit` to pull the
latest version.

## Plugins

### responsive-foundation

Sets up or audits a project's responsive layout foundation: breakpoint tokens as a
single source of truth, fluid type and space scales, container-query-first component
patterns, typed `matchMedia` hooks, and Playwright viewport regression tests.

It triggers on new frontend projects, styling and design-system setup, and any mention
of breakpoints, media or container queries, mobile/tablet/desktop layouts, fluid
typography, or a layout that breaks at a certain width — including "make this
responsive" and "this is broken on mobile".

Supports Tailwind v4, Tailwind v3, and plain CSS / CSS Modules / CSS-in-JS. It reads the
project first and adopts the breakpoints the team already uses.

## Local development

Add the working copy as a marketplace instead of the GitHub repo:

```
/plugin marketplace add /path/to/viewport-kit
```

After editing any file under `plugins/`:

```
/reload-plugins
```

## License

MIT
