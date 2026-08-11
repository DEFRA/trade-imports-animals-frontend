import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  chooseCountryOfOrigin,
  journeyUrl,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { expectNoHorizontalOverflow } from '../../../../../../../../../e2e/live-animals-layout.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const NOTIFICATION_VIEW_SLUG = 'notification-view'

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

const openOrigin = (page) =>
  page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()

test.describe('check-answers feature summary rows', () => {
  test('renders entered and missing answers in their summary rows', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Region of origin code', { exact: true })
      .fill('FR-75')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(rowFor(page, copy.rows.regionCodeRequired)).toContainText(
      copy.yesNo.yes
    )
    await expect(rowFor(page, copy.rows.regionCode)).toContainText('FR-75')
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      'ReviewRef1'
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).toContainText(
      copy.notProvided
    )

    await expectNoHorizontalOverflow(page)
  })

  test('untouched journey renders Not provided for missing answers', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      copy.notProvided
    )
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).toContainText(
      copy.notProvided
    )
  })
})

test.describe('check-answers feature change links', () => {
  test('Change link threads context and returns to the same review after saving', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const changeLink = rowFor(page, copy.rows.internalReference).getByRole(
      'link',
      { name: `${copy.change} internal reference number` }
    )
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).clear()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/notification-view$/)
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )
  })
})

test.describe('check-answers feature navigation and submission', () => {
  test('back link returns to the notification hub', async ({ page }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

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

  test('incomplete journey cannot continue to declaration', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(hubUrl)
  })
})
