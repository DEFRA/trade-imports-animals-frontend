import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyUrl,
  startNotification,
  submitDeclaration
} from '../src/server/app/sets/plant-products/journeys/linear/features/journey.e2e-helper.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/
const confirmationUrl = /^\/plant-products\/notifications\/[^/]+\/confirmation$/

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const reviewLink = (page) =>
  rowByTitle(page, 'Review and submit').getByRole('link', {
    name: 'Review and submit',
    exact: true
  })

test.describe('plant-products whole journey', () => {
  test('full CHED-PP journey reaches confirmation', async ({ page }) => {
    test.slow()
    const reference = await startNotification(page, { profile: 'full' })
    await completeAnswerSections(page, {
      profile: 'full',
      allowCommoditySummaryBypass: true,
      includeNominatedContacts: true
    })

    await reviewLink(page).click()
    await expect(
      page.getByText('Plants, plant products and other objects', {
        exact: true
      })
    ).toBeVisible()
    for (const expected of [
      'France',
      '0808108090',
      'Malus domestica, MABSD',
      'McIntosh Red',
      'TRUCK-038',
      'DOC-2'
    ]) {
      await expect(
        page.getByText(expected, { exact: true }).first()
      ).toBeVisible()
    }

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await submitDeclaration(page)

    await expect(page).toHaveURL((url) => confirmationUrl.test(url.pathname))
    const panel = page.locator('.govuk-panel')
    await expect(panel.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(panel).toContainText(reference)
  })

  test('review link tracks mandatory readiness and incomplete notifications cannot be submitted', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    const nominatedContactsRow = rowByTitle(page, 'Nominated contacts')
    await expect(nominatedContactsRow).toContainText('Optional')
    await expect(reviewLink(page)).toBeVisible()

    await rowByTitle(page, 'Accompanying documents')
      .getByRole('link', { name: 'Accompanying documents', exact: true })
      .click()
    await page.getByRole('button', { name: /^Remove .*DOC-039$/ }).click()
    await page
      .getByRole('button', { name: 'Save and continue', exact: true })
      .click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(nominatedContactsRow).toContainText('Optional')
    await expect(reviewLink(page)).toHaveCount(0)

    const reviewUrl = journeyUrl(page, 'review-notification')
    const notificationHubUrl = journeyUrl(page)
    const notificationConfirmationUrl = journeyUrl(page, 'confirmation')
    await page.goto(reviewUrl)
    await expect(page).toHaveURL(reviewUrl)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Review your notification',
        exact: true
      })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page
      .getByRole('checkbox', {
        name: /I\/We have read and understood the Conditions/
      })
      .check()
    await page
      .getByRole('button', { name: 'Submit notification', exact: true })
      .click()

    await expect(page).toHaveURL(reviewUrl)
    await expect(page).not.toHaveURL(notificationConfirmationUrl)
    await page.goto(notificationConfirmationUrl)
    await expect(page).toHaveURL(notificationHubUrl)

    await rowByTitle(page, 'Accompanying documents')
      .getByRole('link', { name: 'Accompanying documents', exact: true })
      .click()
    await page.getByLabel('Document type').selectOption('AIR_WAYBILL')
    await page.getByLabel('Document reference').fill('DOC-041-GATE')
    await page.getByLabel('Date of issue').fill('04/08/2026')
    await page
      .getByRole('button', { name: 'Add document', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Save and continue', exact: true })
      .click()

    await expect(nominatedContactsRow).toContainText('Optional')
    await expect(reviewLink(page)).toBeVisible()
  })
})
