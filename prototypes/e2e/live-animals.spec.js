import { test, expect } from '@playwright/test'

/**
 * Happy-path walk of the live-animals journey. Grows one leg per increment
 * as pages land, driven by the values in
 * `prototypes/standalone/live-animals/spec/fixtures/happy-path.json`.
 * Legs that still walk the vendored car-insurance journey are transitional
 * and shrink as sections are replaced.
 */
const BASE = '/prototype-standalone/live-animals'

test.describe('live-animals (page-owned spine)', () => {
  test('dashboard — entry page starts a new notification', async ({ page }) => {
    await page.goto(`${BASE}/home`)
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Start a new notification' }).click()

    // Starting a journey lands on the task list — still the vendored
    // car-insurance hub until later increments replace it.
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
  })
})
