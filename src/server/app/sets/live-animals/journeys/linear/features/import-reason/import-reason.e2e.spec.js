import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { answerOriginEntry } from '../../../../../../../../../e2e/live-animals-journey.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const REASON_INPUT_SELECTOR = 'input[name="reasonForImport"]'

const expectNoSeriousOrCriticalAxeViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `Import reason has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const startAtImportReason = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await answerOriginEntry(page)

  await page.goto(reasonUrl)
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

test.describe('import-reason feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportReason(page)
  })

  test('renders the service-backed reasons and feature copy', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.legend })
    const renderedValues = await group
      .locator(REASON_INPUT_SELECTOR)
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(
      importReasonPurpose.reasons().map(({ value }) => value)
    )
    for (const option of importReasonPurpose.reasons()) {
      await expect(
        page.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
      await expect(group).toContainText(copy.reasonHints[option.value])
    }
  })

  test('reason validation: when the submitted option is invalid, links to and focuses the group without preserving an invalid selection', async ({
    page
  }) => {
    await page
      .locator(REASON_INPUT_SELECTOR)
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-reason'
        input.checked = true
      })
    await page.locator('form button[type="submit"]').first().click()

    const reasonError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(reasonError).toBeVisible()
    await reasonError.click()
    await expect(page.locator(REASON_INPUT_SELECTOR).first()).toBeFocused()
    await expect(page.locator(`${REASON_INPUT_SELECTOR}:checked`)).toHaveCount(
      0
    )
  })

  test('saves a valid reason, redirects and persists the answer', async ({
    page
  }) => {
    const reasonUrl = page.url()
    const selected = importReasonPurpose
      .reasons()
      .find(({ value }) => value === 'internalMarket')

    await page.getByRole('radio', { name: selected.text, exact: true }).check()
    await page.locator('form button[type="submit"]').first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(reasonUrl)
    await expect(
      page.getByRole('radio', { name: selected.text, exact: true })
    ).toBeChecked()
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/import-reason$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})
