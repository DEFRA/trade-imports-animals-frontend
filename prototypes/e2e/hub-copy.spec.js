import { test, expect } from '@playwright/test'
import * as j from './journey.js'

/**
 * T2 REGRESSION (browser level) — the hub owns its task-link copy, so an
 * add-on row must show its authored human hint, never the internal page id it
 * used to be derived from (`drivers`). The shared specs navigate rows by TITLE
 * and never observe the hint, so this spec drives the running hub and asserts
 * the rendered `.govuk-task-list__hint` DOM text for a real add-on row.
 */
const V2 = j.JOURNEYS.find((x) => x.id === 'obligations-v2-spike')

/** Start a fresh journey, add the named-driver add-on, land back on the hub. */
const reachHubWithNamedDriver = async (page) => {
  await page.goto(V2.grouped)
  await page.getByRole('button', { name: 'Start now' }).click()

  // Email gate: v2 may redirect to the email page or show the hub first.
  const emailHeading = page.getByRole('heading', {
    name: 'Give us your email to begin'
  })
  const hubHeading = page.getByRole('heading', {
    name: 'Get a car insurance quote'
  })
  await emailHeading.or(hubHeading).first().waitFor()
  if (await hubHeading.isVisible()) {
    await page.getByRole('link', { name: 'Email' }).click()
  }
  await j.fillEmail(page)
  await page.getByRole('button', { name: j.SAVE }).click()

  await page.getByRole('link', { name: 'Add to your policy' }).click()
  await page.getByLabel('Add a named driver').check()
  await page.getByRole('button', { name: j.CONTINUE }).click()
  await expect(hubHeading).toBeVisible()
}

test.describe('obligations v2 — hub add-on copy', () => {
  test('the named-driver add-on row shows its authored hint, not the internal page id', async ({
    page
  }) => {
    await reachHubWithNamedDriver(page)

    const hint = page
      .locator('.govuk-task-list__item')
      .filter({ hasText: 'Add a named driver' })
      .locator('.govuk-task-list__hint')

    await expect(hint).toHaveText(
      'People you want insured to drive your vehicle'
    )
    // The old code rendered the page id `drivers` here.
    await expect(hint).not.toContainText('drivers')
  })
})
