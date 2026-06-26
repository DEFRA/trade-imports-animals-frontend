import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const cya = (page) =>
  expect(
    page.getByRole('heading', { name: 'Check your answers' })
  ).toBeVisible()

test('changing claims to no removes the claims section from the answers', async ({
  page
}) => {
  const claimKey = page
    .locator('.govuk-summary-list__key')
    .filter({ hasText: 'Claim 1' })

  // Reach check-your-answers having declared a claim.
  await j.walkGroupedToCheckAnswers(page, { hadClaims: true })
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
