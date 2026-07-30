import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  chooseCountryOfOrigin,
  journeyUrl,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const summaryRow = (page, key) =>
  page.locator('.govuk-summary-list__row', {
    has: page.getByText(key, { exact: true })
  })

test.describe('check-answers feature', () => {
  test('reflects entered and missing answers, threads Change context and is axe clean', async ({
    page
  }) => {
    await startNotification(page)
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await chooseCountryOfOrigin(page, 'France')
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Region of origin code', { exact: true })
      .fill('FR-75')
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill('ReviewRef1')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto(journeyUrl(page, 'notification-view'))
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(summaryRow(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(summaryRow(page, copy.rows.regionCodeRequired)).toContainText(
      copy.yesNo.yes
    )
    await expect(summaryRow(page, copy.rows.regionCode)).toContainText('FR-75')

    const internalReferenceRow = summaryRow(page, copy.rows.internalReference)
    await expect(internalReferenceRow).toContainText('ReviewRef1')
    const changeLink = internalReferenceRow.getByRole('link', {
      name: `${copy.change} internal reference number`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?change=1$/
    )
    await changeLink.click()
    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/notification-view$/)
    await expect(summaryRow(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Check answers has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])

    const hubUrl = journeyUrl(page)
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('renders Not provided for an untouched journey and cannot continue to declaration', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, 'notification-view'))

    await expect(summaryRow(page, copy.rows.countryOfOrigin)).toContainText(
      copy.notProvided
    )
    await expect(summaryRow(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )
    await expect(summaryRow(page, copy.rows.arrivalDate)).toContainText(
      copy.notProvided
    )

    await page.getByRole('button', { name: copy.submit.button }).click()
    await expect(page).toHaveURL(hubUrl)
  })
})
