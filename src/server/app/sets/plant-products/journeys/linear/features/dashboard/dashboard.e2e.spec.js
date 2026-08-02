// Playwright coverage required by docs/add-a-set.md step 9.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

test.describe('plant-products dashboard', () => {
  test('serves both set dashboards and keeps the unowned root redirect', async ({
    page
  }) => {
    await page.goto('/plant-products')

    await expect(page).toHaveURL('/plant-products')
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.createButton })
    ).toBeVisible()
    await expect(page.getByText(copy.emptyState)).toBeVisible()

    await page.goto('/live-animals')
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()
    await expect(page).toHaveURL('/live-animals')

    const root = await page.request.get('/', { maxRedirects: 0 })
    expect(root.status()).toBe(302)
    expect(root.headers().location).toBe('/live-animals')
  })

  test('creates a plant journey at the plant import-type page', async ({
    page
  }) => {
    await page.goto('/plant-products')
    await page.getByRole('button', { name: copy.createButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
    await expect(
      page.getByRole('radio', {
        name: 'Plants, plant products and other objects'
      })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/plant-products')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(seriousOrCritical).toEqual([])
  })
})
