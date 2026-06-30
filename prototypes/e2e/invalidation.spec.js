import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const cya = (page) =>
  expect(
    page.getByRole('heading', { name: 'Check your answers' })
  ).toBeVisible()

// Conditional-invalidation behaviour must hold for every journey.
for (const journey of j.JOURNEYS) {
  test.describe(journey.label, () => {
    test('changing claims to no removes the claims section from the answers', async ({
      page
    }) => {
      const claimKey = page
        .locator('.govuk-summary-list__key')
        .filter({ hasText: 'Claim 1' })

      // Reach check-your-answers having declared a claim.
      await j.walkGroupedToCheckAnswers(page, journey.grouped, {
        hadClaims: true
      })
      await cya(page)
      await expect(claimKey).toBeVisible()
      await page.waitForTimeout(j.PACE)

      // Change the claims answer to "No" from check-your-answers.
      await page.getByRole('link', { name: 'Change recent claims' }).click()
      await page.getByRole('radio', { name: 'No', exact: true }).check()
      await page.getByRole('button', { name: j.SAVE }).click()

      // The claims sub-loop and its rows have dropped out of the answers entirely.
      await cya(page)
      await expect(claimKey).toHaveCount(0)
      await expect(
        page
          .locator('.govuk-summary-list__row')
          .filter({ hasText: 'Recent claims' })
      ).toContainText('No')
      await page.waitForTimeout(j.PACE)
    })

    test('claims data does not rehydrate after a yes → no → yes round-trip', async ({
      page
    }) => {
      const claimKey = page
        .locator('.govuk-summary-list__key')
        .filter({ hasText: 'Claim 1' })
      const recentClaimsRow = page
        .locator('.govuk-summary-list__row')
        .filter({ hasText: 'Recent claims' })

      // Reach CYA with a claim declared.
      await j.walkGroupedToCheckAnswers(page, journey.grouped, {
        hadClaims: true
      })
      await cya(page)
      await expect(claimKey).toBeVisible()
      await page.waitForTimeout(j.PACE)

      // Down-flip: hadClaims → No. The claim row drops; the underlying claims
      // array + claimsDone flag are cleared by applyAnswer's cascade.
      await page.getByRole('link', { name: 'Change recent claims' }).click()
      await page.getByRole('radio', { name: 'No', exact: true }).check()
      await page.getByRole('button', { name: j.SAVE }).click()
      await cya(page)
      await expect(claimKey).toHaveCount(0)
      await expect(recentClaimsRow).toContainText('No')
      await page.waitForTimeout(j.PACE)

      // Re-flip: hadClaims → Yes. claims comes back into scope, but the previous
      // claim data MUST NOT reappear (no rehydration — canvas steer 4842c61).
      await page.getByRole('link', { name: 'Change recent claims' }).click()
      await page.getByRole('radio', { name: 'Yes', exact: true }).check()
      await page.getByRole('button', { name: j.SAVE }).click()
      await cya(page)
      await expect(recentClaimsRow).toContainText('Yes')
      await expect(claimKey).toHaveCount(0)
      await page.waitForTimeout(j.PACE)
    })
  })
}
