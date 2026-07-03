import { test, expect } from '@playwright/test'
import * as j from './journey.js'

/**
 * Item-scoped conditionality (DISCUSSION-LOG entry 6c), at the DOM level for the
 * obligations-v2 spike: inside a claim item, choosing "Windscreen" reveals — and
 * requires — an approved-repairer question FOR THAT CLAIM ONLY; other claim types
 * never ask it. The per-instance scope/wipe/independence proofs are pinned at the
 * model level in engine/item-conditional.test.js; this proves the wiring reaches
 * the page.
 */
const V2 = j.JOURNEYS.find((x) => x.id === 'obligations-v2-spike')

test.describe('obligations v2 — windscreen claim asks for an approved repairer', () => {
  test('the provider question is revealed only when the claim is a windscreen claim', async ({
    page
  }) => {
    await j.reachClaimEntry(page, V2.grouped)

    const provider = page.getByRole('group', {
      name: 'Which approved repairer did you use?'
    })

    // A non-windscreen claim never asks for a repairer.
    await page.getByLabel('Accident').check()
    await expect(provider).toBeHidden()

    // Choosing Windscreen reveals it, with the three approved repairers.
    await page.getByRole('radio', { name: 'Windscreen', exact: true }).check()
    await expect(provider).toBeVisible()
    await expect(page.getByLabel('Autoglass')).toBeVisible()
    await expect(page.getByLabel('National Windscreens')).toBeVisible()
  })

  test('a windscreen claim records its chosen repairer', async ({ page }) => {
    await j.reachClaimEntry(page, V2.grouped)

    await page.getByRole('radio', { name: 'Windscreen', exact: true }).check()
    await page.getByLabel('Autoglass').check()
    await page.getByLabel('Approximate claim amount').fill('250')
    await page.getByRole('button', { name: 'Add claim' }).click()

    // Back on the claims hub, the windscreen claim is listed.
    await expect(
      page.locator('.govuk-summary-list__key').filter({ hasText: 'Claim 1' })
    ).toBeVisible()
    await expect(
      page.locator('.govuk-summary-list__row').filter({ hasText: 'Claim 1' })
    ).toContainText('Windscreen')
  })
})
