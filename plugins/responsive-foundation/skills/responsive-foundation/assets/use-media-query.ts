/**
 * Typed matchMedia hooks.
 *
 * Use these only when JS genuinely needs the answer: the component TREE differs
 * by breakpoint, or a library takes a number. Hiding an element with JS instead
 * of CSS ships the markup anyway and adds a hydration mismatch and a layout
 * shift on top.
 */

import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, up, down, type Breakpoint } from './breakpoints';

/* useSyncExternalStore re-subscribes whenever the `subscribe` identity changes.
 * Building the closure inline would hand it a new function on every render and
 * tear down/re-add the listener each time. Cache one per query string instead. */
const subscribers = new Map<string, (onChange: () => void) => () => void>();

function getSubscriber(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

/**
 * @param query          A media query string, e.g. `up('md')` or `'(pointer: coarse)'`.
 * @param serverFallback Value used during SSR and the first hydration render.
 *                       Pick it to match the most common visitor, not the
 *                       developer's monitor.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  return useSyncExternalStore(
    getSubscriber(query),
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export const useBreakpointUp = (bp: Breakpoint, serverFallback = false): boolean =>
  useMediaQuery(up(bp), serverFallback);

export const useBreakpointDown = (bp: Breakpoint, serverFallback = false): boolean =>
  useMediaQuery(down(bp), serverFallback);

export const usePrefersReducedMotion = (): boolean =>
  useMediaQuery('(prefers-reduced-motion: reduce)', false);

/* Widest first: the active step is the first `up()` that matches, not every one
 * that does. Below the smallest breakpoint the answer is null, which is a real
 * state (the base, unqualified layout) and not an error. */
const ORDERED = (Object.keys(BREAKPOINTS) as Breakpoint[]).reverse();

/* One store subscribing to every breakpoint at once.
 * NOT useMediaQuery called in a .map() — that is a hook call inside a loop, which
 * breaks the rules of hooks the moment the breakpoint list changes length. */
function subscribeAll(onChange: () => void): () => void {
  const lists = ORDERED.map((bp) => window.matchMedia(up(bp)));
  lists.forEach((mql) => mql.addEventListener('change', onChange));
  return () => lists.forEach((mql) => mql.removeEventListener('change', onChange));
}

/** The single currently-active breakpoint, or null below the smallest one. */
export function useBreakpoint(
  serverFallback: Breakpoint | null = null,
): Breakpoint | null {
  return useSyncExternalStore(
    subscribeAll,
    () => ORDERED.find((bp) => window.matchMedia(up(bp)).matches) ?? null,
    () => serverFallback,
  );
}
