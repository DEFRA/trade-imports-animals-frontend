import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyIdFromPage,
  startNotification,
  values
} from '../../../../../e2e/live-animals-journey.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const dashboardCard = (page, reference) =>
  page.locator('.govuk-summary-card', { hasText: reference })

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
  expect(
    seriousOrCritical,
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('cancel-amend feature', () => {
  test('keeps the amendment on No and restores the submitted snapshot on confirmation', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    const reference = journeyIdFromPage(page)

    await page.goto('/')
    await dashboardCard(page, reference)
      .getByRole('button', { name: `Amend notification ${reference}` })
      .click()
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await chooseCountryOfOrigin(page, 'France')
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill('DiscardMe99')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await expect(page.getByText('DiscardMe99')).toBeVisible()
    await page
      .getByRole('link', { name: checkAnswersCopy.cancelAmend.link })
      .click()

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: copy.noLink })).toBeVisible()
    await expect(page.locator('.govuk-back-link')).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/notification-view$/
    )

    await expectAxeClean(page, 'Cancel amendment')

    await page.getByRole('button', { name: copy.noLink }).click()
    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toContainText('Amending')
    await expect(page.getByText('DiscardMe99')).toBeVisible()

    await page
      .getByRole('link', { name: checkAnswersCopy.cancelAmend.link })
      .click()
    await page.getByRole('button', { name: copy.confirmButton }).click()

    await expect(
      page.getByText(checkAnswersCopy.cancelAmend.successBody)
    ).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toContainText('Submitted')
    await expect(page.getByText('DiscardMe99')).toHaveCount(0)
    await expect(page.getByText(values.internalReferenceNumber)).toBeVisible()
    await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
    await expectAxeClean(page, 'Read-only submitted check answers')
  })
})
