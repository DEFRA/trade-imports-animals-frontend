import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  addDocument,
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyIdFromPage,
  searchAndSelect,
  startNotification,
  unlockSections,
  values
} from './live-animals-journey.js'

// GOV.UK Frontend's conditional-reveal JS adds aria-controls + aria-expanded to
// govuk radios/checkboxes. axe 4.12 flags aria-expanded on role=radio/checkbox as
// aria-allowed-attr (the ARIA spec does not list it), but GDS ships this pattern
// deliberately (AT-tested); changing it means leaving the govuk-frontend toolbox
// or a framework upgrade (separate lane). Waive ONLY that exact case — nothing
// broader — so the scan still catches every real serious/critical violation.
const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

const scan = async (page, state) => {
  await test.step(`axe: ${state}`, async () => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations
      .filter(({ impact }) => ['serious', 'critical'].includes(impact))
      .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

    expect(
      seriousOrCritical,
      `${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
}

const dashboardCard = (page, reference) =>
  page.locator('.govuk-summary-card').filter({ hasText: reference })

test.describe('live-animals accessibility', () => {
  test('entry, filter and representative journey states have no serious or critical violations', async ({
    page
  }) => {
    await page.goto(`${BASE}/home`)
    await scan(page, 'empty dashboard')

    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await scan(page, 'import-type filter')

    await page
      .getByRole('radio', {
        name: 'Products of animal origin or animal by-products'
      })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await scan(page, 'not-available holding page')

    await page
      .getByRole('link', { name: 'Go back and change your answer' })
      .click()
    await page
      .getByRole('radio', { name: 'Live animals or germinal products' })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await scan(page, 'origin')

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await scan(page, 'origin validation error summary')

    await chooseCountryOfOrigin(page)
    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await scan(page, 'commodity search')

    await searchAndSelect(page, 'Cat', ['Felis catus'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await scan(page, 'consignment details')

    await page.goto(`${BASE}/home`)
    await expect(page.locator('.govuk-summary-card')).toHaveCount(1)
    await scan(page, 'dashboard with rows')
  })

  test('documents with an uploaded file have no serious or critical violations', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await unlockSections(page)
    await page.getByRole('link', { name: 'Uploaded documents' }).click()

    const [document] = values.documents
    await addDocument(page, document)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: document.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    await scan(page, 'documents with an uploaded document')
  })

  test('review, submitted and destructive lifecycle states have no serious or critical violations', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    await page.getByRole('link', { name: 'Check and submit' }).click()
    await scan(page, 'editable draft check your answers')

    const submittedReference = journeyIdFromPage(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await scan(page, 'submission confirmation')

    await page.goto(`${BASE}/home`)
    const submittedCard = dashboardCard(page, submittedReference)
    await submittedCard
      .getByRole('link', {
        name: `View notification ${submittedReference}`
      })
      .click()
    await scan(page, 'read-only submitted check your answers')

    await page.goto(`${BASE}/home`)
    await submittedCard
      .getByRole('button', {
        name: `Amend notification ${submittedReference}`
      })
      .click()
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('link', { name: 'Cancel amendment' }).click()
    await scan(page, 'cancel-amend confirmation')

    await page.getByRole('button', { name: 'Yes, cancel amendment' }).click()
    await startNotification(page)
    const draftReference = journeyIdFromPage(page)
    await page.goto(`${BASE}/home`)
    await dashboardCard(page, draftReference)
      .getByRole('link', {
        name: `Delete notification ${draftReference}`
      })
      .click()
    await scan(page, 'delete confirmation')
  })
})
