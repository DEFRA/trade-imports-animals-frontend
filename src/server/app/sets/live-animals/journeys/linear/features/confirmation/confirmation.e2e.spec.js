import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyIdFromPage,
  journeyUrl,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

test.describe('confirmation feature', () => {
  test('redirects an unsubmitted notification back to its hub', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)

    await page.goto(journeyUrl(page, 'confirmation'))

    await expect(page).toHaveURL(hubUrl)
  })
})

test.describe('submitted confirmation feature', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/confirmation$/)
  })

  test('renders the notification reference, all feature copy and no back link', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)
    await expect(
      page.getByRole('heading', { name: copy.panel.title })
    ).toBeVisible()
    await expect(page.getByText(copy.panel.referencePrefix)).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.getByText(new RegExp(`^${copy.dateOfDeclaration}`))
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: copy.transporting.heading })
    ).toBeVisible()
    await expect(page.getByText(copy.transporting.direct)).toBeVisible()
    await expect(page.getByText(copy.transporting.inspection)).toBeVisible()
    await expect(page.getByText(copy.transporting.stay)).toBeVisible()
    for (const item of copy.transporting.stayItems) {
      await expect(page.getByText(item, { exact: true })).toBeVisible()
    }

    await expect(
      page.getByRole('heading', { name: copy.viewOrAmend.heading })
    ).toBeVisible()
    await expect(page.getByText(copy.viewOrAmend.body)).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.viewOrAmend.dashboardLink })
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: copy.help.heading })
    ).toBeVisible()
    await expect(page.getByText(copy.help.technicalHelp)).toBeVisible()
    await expect(page.getByText(copy.help.telephone)).toBeVisible()
    await expect(page.getByText(copy.help.openingHours)).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.help.customsLink })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.help.callCharges })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveCount(0)
  })

  test('dashboard link returns to the dashboard', async ({ page }) => {
    const dashboardLink = page.getByRole('link', {
      name: copy.viewOrAmend.dashboardLink
    })
    await expect(dashboardLink).toHaveAttribute('href', '/')

    await dashboardLink.click()

    await expect(page).toHaveURL('/')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Confirmation has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
