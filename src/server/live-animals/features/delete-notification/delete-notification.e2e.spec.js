import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  journeyIdFromPage,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const dashboardCard = (page, reference) =>
  page.locator('.govuk-summary-card', { hasText: reference })

test.describe('delete-notification feature', () => {
  test('keeps the record on No and removes it after confirmation', async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)
    await page.goto('/')
    await dashboardCard(page, reference)
      .getByRole('link', {
        name: `Delete ${dashboardCopy.actionHidden(reference)}`
      })
      .click()

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.noLink })
    ).toHaveAttribute('href', '/')
    await expect(page.locator('.govuk-back-link')).toHaveAttribute('href', '/')

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

    await page.getByRole('button', { name: copy.noLink }).click()
    await expect(dashboardCard(page, reference)).toBeVisible()

    await dashboardCard(page, reference)
      .getByRole('link', {
        name: `Delete ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
    await page.getByRole('button', { name: copy.confirmButton }).click()

    await expect(page).toHaveURL('/?deleted=1')
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successTitle)
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successBody)
    ).toBeVisible()
    await expect(dashboardCard(page, reference)).toHaveCount(0)
  })
})
