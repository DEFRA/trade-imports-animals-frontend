import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtImportType = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

const continueJourney = (page) =>
  page.locator('form button[type="submit"]').click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('import-type-filter feature', () => {
  test('renders every import type, feature copy and working dashboard back link', async ({
    page
  }) => {
    await startAtImportType(page)

    const expected = Object.entries(copy.importTypes)
    const rendered = await page
      .locator('input[name="importType"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => ({
          value: input.value,
          label: input.labels[0].textContent.trim()
        }))
      )
    expect(rendered).toEqual(
      expected.map(([value, label]) => ({ value, label }))
    )
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()

    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL('/')
  })

  test('shows the required validation rule', async ({ page }) => {
    await startAtImportType(page)

    await continueJourney(page)

    await expect(errorLink(page, copy.errors.importTypeRequired)).toBeVisible()
    await expect(page.locator('input[name="importType"]:checked')).toHaveCount(
      0
    )
  })

  test('saves an unsupported type and renders the not-available copy with working return links', async ({
    page
  }) => {
    await startAtImportType(page)
    const selected = 'poao'

    await page.locator(`input[name="importType"][value="${selected}"]`).check()
    await continueJourney(page)

    await expect(page).toHaveURL(
      /\/notifications\/[^/]+\/import-type\/not-available$/
    )
    await expect(
      page.getByRole('heading', { name: copy.notAvailable.title })
    ).toBeVisible()
    await expect(page.getByText(copy.notAvailable.onlyCovers)).toBeVisible()
    await expect(page.getByText(copy.notAvailable.ifImporting)).toBeVisible()

    await page
      .getByRole('link', { name: copy.notAvailable.changeAnswer })
      .click()
    await expect(
      page.locator(`input[name="importType"][value="${selected}"]`)
    ).toBeChecked()

    await page.locator(`input[name="importType"][value="${selected}"]`).check()
    await continueJourney(page)
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/import-type$/)
  })

  test('saves the supported type, redirects to origin and persists the answer', async ({
    page
  }) => {
    await startAtImportType(page)
    const importTypeUrl = page.url()

    await page.locator('input[name="importType"][value="live-animals"]').check()
    await continueJourney(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
    await page.goto(importTypeUrl)
    await expect(
      page.locator('input[name="importType"][value="live-animals"]')
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtImportType(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Import type filter has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
