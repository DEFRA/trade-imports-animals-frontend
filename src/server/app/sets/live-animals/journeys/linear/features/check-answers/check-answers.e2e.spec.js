import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  chooseCountryOfOrigin,
  journeyUrl,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

test.describe('check-answers feature', () => {
  test('renders entered and missing answers in their summary rows', async ({
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
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.countryOfOrigin, { exact: true })
        })
        .locator('..')
    ).toContainText('France')
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.regionCodeRequired, { exact: true })
        })
        .locator('..')
    ).toContainText(copy.yesNo.yes)
    await expect(
      page
        .getByRole('term')
        .filter({ has: page.getByText(copy.rows.regionCode, { exact: true }) })
        .locator('..')
    ).toContainText('FR-75')
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.internalReference, { exact: true })
        })
        .locator('..')
    ).toContainText('ReviewRef1')
    await expect(
      page
        .getByRole('term')
        .filter({ has: page.getByText(copy.rows.arrivalDate, { exact: true }) })
        .locator('..')
    ).toContainText(copy.notProvided)
  })

  test('Change link threads context and returns to the same review after saving', async ({
    page
  }) => {
    await startNotification(page)
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await chooseCountryOfOrigin(page, 'France')
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill('ReviewRef1')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto(journeyUrl(page, 'notification-view'))

    const internalReferenceRow = page
      .getByRole('term')
      .filter({
        has: page.getByText(copy.rows.internalReference, { exact: true })
      })
      .locator('..')
    const changeLink = internalReferenceRow.getByRole('link', {
      name: `${copy.change} internal reference number`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /^\/live-animals\/notifications\/[^/]+\/origin\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/notification-view$/.test(
        url.pathname
      )
    )
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.internalReference, { exact: true })
        })
        .locator('..')
    ).toContainText(copy.notProvided)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, 'notification-view'))

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, 'notification-view'))

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
  })

  test('untouched journey renders Not provided for missing answers', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, 'notification-view'))

    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.countryOfOrigin, { exact: true })
        })
        .locator('..')
    ).toContainText(copy.notProvided)
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(copy.rows.internalReference, { exact: true })
        })
        .locator('..')
    ).toContainText(copy.notProvided)
    await expect(
      page
        .getByRole('term')
        .filter({ has: page.getByText(copy.rows.arrivalDate, { exact: true }) })
        .locator('..')
    ).toContainText(copy.notProvided)
  })

  test('incomplete journey cannot continue to declaration', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, 'notification-view'))

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(hubUrl)
  })
})
