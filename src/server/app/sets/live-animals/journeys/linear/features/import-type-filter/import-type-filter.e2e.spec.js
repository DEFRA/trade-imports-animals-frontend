import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'
const POAO_RADIO_SELECTOR = 'input[name="importType"][value="poao"]'

const startAtImportType = async (page) => {
  await page.goto('/live-animals')
  await page
    .locator('form[action="/live-animals/notifications"]')
    .getByRole('button')
    .click()
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

const saveUnsupportedType = async (page) => {
  await page.locator(POAO_RADIO_SELECTOR).check()
  await page.locator(SUBMIT_BUTTON_SELECTOR).click()
}

const expectNoSeriousOrCriticalAxeViolations = async (page, pageName) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${pageName} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('import-type-filter feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportType(page)
  })

  test('renders every import type and feature copy', async ({ page }) => {
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
  })

  test('back link returns to the dashboard', async ({ page }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL('/live-animals')
  })

  test('import type validation: when no option is selected, links to and focuses the empty group', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON_SELECTOR).click()

    const importTypeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.importTypeRequired })
    await expect(importTypeError).toBeVisible()
    await importTypeError.click()
    await expect(page.locator('input[name="importType"]').first()).toBeFocused()
    await expect(page.locator('input[name="importType"]:checked')).toHaveCount(
      0
    )
  })

  test('saves the supported type, redirects to origin and persists the answer', async ({
    page
  }) => {
    const importTypeUrl = page.url()

    await page.locator('input[name="importType"][value="live-animals"]').check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/origin$/.test(url.pathname)
    )
    await page.goto(importTypeUrl)
    await expect(
      page.locator('input[name="importType"][value="live-animals"]')
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(page, 'Import type filter')
  })
})

test.describe('import-type-filter not-available page', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportType(page)
  })

  test('saves an unsupported type and renders the not-available copy', async ({
    page
  }) => {
    await saveUnsupportedType(page)

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/import-type\/not-available$/.test(
        url.pathname
      )
    )
    await expect(
      page.getByRole('heading', { name: copy.notAvailable.title })
    ).toBeVisible()
    await expect(page.getByText(copy.notAvailable.onlyCovers)).toBeVisible()
    await expect(page.getByText(copy.notAvailable.ifImporting)).toBeVisible()
  })

  test('change-answer link returns to the import type page and preserves the unsupported answer', async ({
    page
  }) => {
    await saveUnsupportedType(page)
    await page
      .getByRole('link', { name: copy.notAvailable.changeAnswer })
      .click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
    await expect(page.locator(POAO_RADIO_SELECTOR)).toBeChecked()
  })

  test('not-available back link returns to the import type page', async ({
    page
  }) => {
    await saveUnsupportedType(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
  })

  test('not-available page has no serious or critical axe violations', async ({
    page
  }) => {
    await saveUnsupportedType(page)

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Import type not available'
    )
  })
})
