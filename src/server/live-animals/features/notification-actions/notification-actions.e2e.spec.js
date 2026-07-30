import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  journeyIdFromPage,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as sharedCopy } from '../../shared/copy.en.js'

const dashboardCard = (page, reference) =>
  page.locator('.govuk-summary-card', { hasText: reference })

test.describe('notification-actions feature', () => {
  test('copies a known notification into a separate draft with its answers', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    const sourceReference = journeyIdFromPage(page)

    await page.goto('/')
    await dashboardCard(page, sourceReference)
      .getByRole('button', {
        name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actionHidden(sourceReference)}`
      })
      .click()

    await expect(
      page.getByRole('heading', { name: hubCopy.title })
    ).toBeVisible()
    const copiedReference = journeyIdFromPage(page)
    expect(copiedReference).not.toBe(sourceReference)
    await expect(page.locator('.app-journey-strip')).toContainText('Draft')
    await expect(
      page.locator('.govuk-task-list__item', {
        hasText: hubCopy.rows.origin.title
      })
    ).toContainText(hubCopy.statuses.completed)

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

    await page.goto('/')
    await expect(dashboardCard(page, sourceReference)).toBeVisible()
    await expect(dashboardCard(page, copiedReference)).toBeVisible()
  })
})
