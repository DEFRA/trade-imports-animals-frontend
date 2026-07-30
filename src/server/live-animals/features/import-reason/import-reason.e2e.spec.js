import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { validatorDefaults } from '../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const startAtImportReason = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  await page.goto(page.url().replace(/\/origin$/, '/import-reason'))
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('import-reason feature', () => {
  test('renders the service-backed reasons, feature copy and working back link', async ({
    page
  }) => {
    await startAtImportReason(page)

    const group = page.getByRole('group', { name: copy.legend })
    const renderedValues = await group
      .locator('input[name="reasonForImport"]')
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

    const hubUrl = page.url().replace(/\/import-reason$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('rejects the controller out-of-list case without committing it', async ({
    page
  }) => {
    await startAtImportReason(page)

    await page
      .locator('input[name="reasonForImport"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-reason'
        input.checked = true
      })
    await saveAndContinue(page)

    await expect(errorLink(page, validatorDefaults.oneOf)).toBeVisible()
    await expect(
      page.locator('input[name="reasonForImport"]:checked')
    ).toHaveCount(0)
  })

  test('saves a valid reason, redirects and persists the answer', async ({
    page
  }) => {
    await startAtImportReason(page)
    const reasonUrl = page.url()
    const selected = importReasonPurpose
      .reasons()
      .find(({ value }) => value === 'internalMarket')

    await page.getByRole('radio', { name: selected.text, exact: true }).check()
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(reasonUrl)
    await expect(
      page.getByRole('radio', { name: selected.text, exact: true })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtImportReason(page)

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
  })
})
