import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  journeyIdFromPage,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const DASHBOARD_PATH = '/live-animals'

test.describe('delete-notification feature', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)
    await page.goto(DASHBOARD_PATH)
    await page
      .getByRole('link', {
        name: `Delete ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
  })

  test('renders confirmation copy, actions and dashboard links', async ({
    page
  }) => {
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.noLink })
    ).toHaveAttribute('href', DASHBOARD_PATH)
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', DASHBOARD_PATH)
  })

  test('No returns to the dashboard and keeps the notification', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)

    await page.getByRole('button', { name: copy.noLink }).click()

    await expect(page).toHaveURL(DASHBOARD_PATH)
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
  })

  test('confirmation removes the notification and shows the success banner', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)

    await page.getByRole('button', { name: copy.confirmButton }).click()

    await expect(page).toHaveURL('/live-animals?deleted=1')
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successTitle)
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successBody)
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toHaveCount(0)
  })

  test('confirmation page has no serious or critical axe violations', async ({
    page
  }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Delete notification has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
