import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

// The tag list is wider than the two WCAG 2.0 tags the recipe first named,
// because axe-core tags a rule by the WCAG version that introduced it: a rule
// only reachable through the 2.1 or 2.2 tags would otherwise never run.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const BLOCKING_IMPACTS = ['serious', 'critical']

const JSON_INDENT = 2

/**
 * Fail the test on any serious or critical accessibility violation.
 *
 * The multi-page group's shared axe helper: each of its pages is checked on
 * its initial render and again in its validation-error state, and a helper
 * keeps the tag list and the impact threshold identical across every one of
 * those checks.
 *
 * @param {import('@playwright/test').Page} page - the page under test.
 * @param {string} subject - what is being checked, named in the failure.
 */
export const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const blocking = results.violations.filter(({ impact }) =>
    BLOCKING_IMPACTS.includes(impact)
  )

  expect(
    blocking,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, JSON_INDENT)}`
  ).toEqual([])
}
