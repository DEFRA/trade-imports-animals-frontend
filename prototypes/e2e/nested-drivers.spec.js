import { test, expect } from '@playwright/test'
import * as j from './journey.js'

/**
 * Nested indexed obligations (DISCUSSION-LOG entry 6b) — a loop inside a loop,
 * proven at the DOM level for the obligations-v2 spike only (the one journey
 * that models named drivers as an indexed collection each owning nested claims).
 * Pins: two drivers hold INDEPENDENT nested claims; removing a driver destroys
 * only that driver's subtree; and Yes→No→Yes on the whole collection does not
 * rehydrate at depth (destroyed, not hidden).
 */
const V2 = j.JOURNEYS.find((x) => x.id === 'obligations-v2-spike')

const addDriverWithClaim = async (page, name, claimLabel, amount) => {
  await page
    .getByRole('button', { name: /Add a driver|Add another driver/ })
    .click()
  await page.getByLabel('Full name').fill(name)
  await page.getByLabel('Spouse or partner').check()
  await page.getByRole('button', { name: j.SAVE }).click() // → driver detail
  await page
    .getByRole('button', { name: /Add a claim|Add another claim/ })
    .click()
  await page.getByLabel(claimLabel).check()
  await page.getByLabel('Approximate claim amount').fill(amount)
  await page.getByRole('button', { name: 'Add claim' }).click() // → driver detail
  await page.getByRole('button', { name: j.CONTINUE }).click() // → drivers hub
}

const driverKey = (page, n) =>
  page.locator('.govuk-summary-list__key').filter({ hasText: `Driver ${n}` })

test.describe('obligations v2 — nested drivers → claims', () => {
  test('two drivers hold independent nested claims; removing one leaves the other intact', async ({
    page
  }) => {
    await j.reachDriversHub(page, V2.grouped)

    await addDriverWithClaim(page, 'Sam Spouse', 'Accident', '100')
    await addDriverWithClaim(page, 'Jo Partner', 'Theft', '200')

    // Both drivers listed on the outer hub.
    await expect(driverKey(page, 1)).toBeVisible()
    await expect(driverKey(page, 2)).toBeVisible()

    // Driver 1's detail shows ONLY its own claim (independent nested collections).
    await page.getByRole('link', { name: 'Change driver 1' }).click()
    await expect(
      page.locator('.govuk-summary-list__row').filter({ hasText: 'Claim 1' })
    ).toContainText('Accident — £100')
    await expect(page.getByText('Theft')).toHaveCount(0)
    await page.getByRole('button', { name: j.CONTINUE }).click()

    // Remove driver 1. Driver 2 (Theft £200) survives and becomes Driver 1.
    await page.getByRole('link', { name: 'Remove driver 1' }).click()
    await expect(driverKey(page, 2)).toHaveCount(0)
    await page.getByRole('link', { name: 'Change driver 1' }).click()
    await expect(
      page.locator('.govuk-summary-list__row').filter({ hasText: 'Claim 1' })
    ).toContainText('Theft — £200')
    await expect(page.getByText('Accident')).toHaveCount(0)
  })

  test('deselecting then reselecting named-driver destroys the whole subtree — no rehydrate at depth', async ({
    page
  }) => {
    await j.reachDriversHub(page, V2.grouped)
    await addDriverWithClaim(page, 'Sam Spouse', 'Accident', '100')
    await expect(driverKey(page, 1)).toBeVisible()

    // Deselect the add-on entirely: drivers (and every nested claim) leave scope.
    await page.getByRole('button', { name: j.CONTINUE }).click() // hub → main hub
    await page.getByRole('link', { name: 'Add to your policy' }).click()
    await page.getByLabel('Add a named driver').uncheck()
    await page.getByRole('button', { name: j.CONTINUE }).click()

    // Reselect: the drivers collection comes back into scope EMPTY — the driver
    // and its nested claim were destroyed, not hidden.
    await page.getByRole('link', { name: 'Add to your policy' }).click()
    await page.getByLabel('Add a named driver').check()
    await page.getByRole('button', { name: j.CONTINUE }).click()
    await page.getByRole('link', { name: 'Add a named driver' }).click()

    await expect(driverKey(page, 1)).toHaveCount(0)
    await expect(
      page.getByText('You have not added any named drivers yet.')
    ).toBeVisible()
  })
})
