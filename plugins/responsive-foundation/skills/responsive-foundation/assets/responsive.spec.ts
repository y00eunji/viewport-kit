/**
 * Viewport regression matrix.
 *
 * Checks horizontal overflow at every viewport × route. That one assertion is
 * worth automating above all others: it is the most common responsive defect, it
 * is detected unambiguously by scrollWidth > clientWidth, and it is invisible on
 * the wide monitor where the code was written.
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'phone-sm', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

/* Add the routes that matter for this project. */
const ROUTES = ['/'];

/* Keep phone-sm. 320px is where fixed min-widths and un-wrapped flex rows break,
 * and dropping it removes the only viewport that catches them. */
for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const excess = doc.scrollWidth - doc.clientWidth;
          if (excess <= 0) return null;

          /* A bare boolean gets a failing test skipped instead of fixed.
           * Report the widest offenders so the failure names the culprit. */
          const culprits = Array.from(document.body.querySelectorAll('*'))
            .map((el) => ({ el, right: el.getBoundingClientRect().right }))
            .filter((x) => x.right > doc.clientWidth + 1)
            .sort((a, b) => b.right - a.right)
            .slice(0, 3)
            .map(({ el }) => {
              const cls = (el.className || '').toString().trim().split(/\s+/).filter(Boolean);
              return el.tagName.toLowerCase() + (cls.length ? `.${cls.join('.')}` : '');
            });

          return { excess, culprits };
        });

        expect(
          overflow,
          overflow
            ? `overflows by ${overflow.excess}px — ${overflow.culprits.join(', ')}`
            : '',
        ).toBeNull();
      });
    }
  });
}
