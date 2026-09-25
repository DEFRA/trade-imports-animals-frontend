import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const BLOCKING_IMPACTS = ['serious', 'critical']

const JSON_INDENT = 2

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
