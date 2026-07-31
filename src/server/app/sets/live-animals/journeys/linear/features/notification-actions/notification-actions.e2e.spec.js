import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  journeyIdFromPage,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'

test.describe('notification-actions feature', () => {
  test('copy creates a separate draft notification', async ({ page }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    const sourceReference = journeyIdFromPage(page)
    await page.goto('/')

    await page
      .getByRole('button', {
        name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actionHidden(sourceReference)}`
      })
      .click()

    await expect(
      page.getByRole('heading', { name: hubCopy.title })
    ).toBeVisible()
    const copiedReference = journeyIdFromPage(page)
    expect(copiedReference).not.toBe(sourceReference)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  })

  test('copy preserves the source answers in the new draft', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    const sourceReference = journeyIdFromPage(page)
    await page.goto('/')

    await page
      .getByRole('button', {
        name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actionHidden(sourceReference)}`
      })
      .click()

    const origin = page.getByRole('listitem').filter({
      has: page.getByText(hubCopy.rows.origin.title, { exact: true })
    })
    await expect(origin).toContainText(hubCopy.statuses.completed)
    await origin.getByRole('link', { name: hubCopy.rows.origin.title }).click()
    await expect(page.getByLabel('Country of origin')).toHaveValue('FR')
  })

  test('copy leaves both source and copied notifications on the dashboard', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    const sourceReference = journeyIdFromPage(page)
    await page.goto('/')
    await page
      .getByRole('button', {
        name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actionHidden(sourceReference)}`
      })
      .click()
    const copiedReference = journeyIdFromPage(page)

    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: sourceReference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copiedReference, exact: true })
    ).toBeVisible()
  })

  test('copied notification hub has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    const sourceReference = journeyIdFromPage(page)
    await page.goto('/')
    await page
      .getByRole('button', {
        name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actionHidden(sourceReference)}`
      })
      .click()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Copied notification hub has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
