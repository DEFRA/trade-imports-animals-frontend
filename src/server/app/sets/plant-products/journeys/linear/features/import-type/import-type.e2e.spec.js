// Playwright coverage required by docs/add-a-set.md step 9.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtImportType = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
  )
}

const seriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  return results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
}

test.describe('plant-products import type', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportType(page)
  })

  test('renders the caption, legend heading and four certificate types', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(4)
    await expect(
      page.getByRole('radio', { name: copy.importTypes.plantProducts })
    ).toBeVisible()
  })

  test('saves the plant selection and exits the opening run to the plant hub', async ({
    page
  }) => {
    await page
      .getByRole('radio', { name: copy.importTypes.plantProducts })
      .check()
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    await expect(
      page.getByText('Review and submit', { exact: true })
    ).toBeVisible()
  })

  test('links the empty-submit error summary to the radio group', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page.getByRole('alert')).toContainText('There is a problem')
    const link = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.importTypeRequired })
    await link.click()
    await expect(page.getByRole('radio').first()).toBeFocused()
  })

  test('sends a non-plant selection to the holding page', async ({ page }) => {
    await page
      .getByRole('radio', { name: copy.importTypes.liveAnimals })
      .check()
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/import-type\/not-available$/.test(
        url.pathname
      )
    )
    await expect(
      page.getByRole('heading', { name: copy.notAvailable.title })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations initially or after validation', async ({
    page
  }) => {
    expect(await seriousOrCriticalViolations(page)).toEqual([])

    await page.getByRole('button', { name: copy.continueButton }).click()
    expect(await seriousOrCriticalViolations(page)).toEqual([])
  })
})
