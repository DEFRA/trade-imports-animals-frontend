// Playwright coverage required by docs/add-a-set.md step 9.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtHub = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

test.describe('plant-products hub', () => {
  test.beforeEach(async ({ page }) => {
    await startAtHub(page)
  })

  test('renders the reference and unavailable Review and submit entry', async ({
    page
  }) => {
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    await expect(page.getByText(/^GBN-PP-/)).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    const review = page.getByRole('listitem').filter({
      has: page.getByText(copy.review.title, { exact: true })
    })
    await expect(review).toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.review.title })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(seriousOrCritical).toEqual([])
  })
})
