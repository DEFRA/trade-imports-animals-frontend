import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyIdFromPage,
  journeyUrl,
  startNotification,
  submitDeclaration
} from '../journey.e2e-helper.js'
import { axeViolations } from '../axe.e2e-helper.js'
import { copy } from './copy/copy.en.js'

const confirmationUrl = /^\/plant-products\/notifications\/[^/]+\/confirmation$/

const expectSubmittedConfirmation = async (page) => {
  await startNotification(page)
  await completeAnswerSections(page)
  await submitDeclaration(page)
  await expect(page).toHaveURL((url) => confirmationUrl.test(url.pathname))
}

test.describe('plant-products confirmation', () => {
  test('redirects an unsubmitted notification back to its hub', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)

    await page.goto(journeyUrl(page, 'confirmation'))

    await expect(page).toHaveURL(hubUrl)
  })
})

test.describe('submitted plant-products confirmation', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await expectSubmittedConfirmation(page)
  })

  test('renders the submitted notification summary and terminal guidance', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)
    await expect(page).toHaveTitle(
      `${copy.title} | Import notification service`
    )
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: copy.panel.title,
        exact: true
      })
    ).toHaveClass(/govuk-panel__title/)
    await expect(page.getByText(copy.panel.referencePrefix)).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toHaveCount(3)

    const summary = page.locator('.govuk-summary-list')
    await expect(summary.locator('.govuk-summary-list__row')).toHaveCount(4)
    await expect(summary).toContainText(copy.references.notificationLabel)
    await expect(summary).toContainText(copy.references.customsLabel)
    await expect(summary).toContainText(copy.references.documentCodeLabel)
    await expect(summary).toContainText('C085')
    await expect(summary).toContainText(copy.inspection.label)
    await expect(summary).toContainText(copy.inspection.notRequired)
    await expect(page.locator('.govuk-warning-text')).toContainText(
      copy.warning
    )

    for (const heading of [
      copy.whatYouNeedToDo.heading,
      copy.whatHappensNext.heading,
      copy.viewOrAmend.heading
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: heading, exact: true })
      ).toBeVisible()
    }
    for (const body of [
      copy.whatYouNeedToDo.noInspection,
      copy.whatYouNeedToDo.canChange,
      copy.whatHappensNext.inspectorMayUpdate,
      copy.whatHappensNext.ifChanges,
      copy.viewOrAmend.body
    ]) {
      await expect(page.getByText(body, { exact: true })).toBeVisible()
    }

    await expect(
      page.getByRole('link', {
        name: copy.viewOrAmend.dashboardLink,
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.createLink, exact: true })
    ).toHaveAttribute('href', '/plant-products')
    await expect(page.getByRole('link', { name: 'Back' })).toHaveCount(0)
    await expect(page.locator('main form')).toHaveCount(0)
    await expect(
      page.locator('main button, main input, main select, main textarea')
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copy' })).toHaveCount(0)
    await expect(page.locator('.govuk-error-message')).toHaveCount(0)
  })

  test('renders exactly one h1', async ({ page }) => {
    await expect(page.locator('main h1')).toHaveCount(1)
  })

  test('resolves the dashboard link to the plant-products mount', async ({
    page
  }) => {
    const dashboardLink = page.getByRole('link', {
      name: copy.viewOrAmend.dashboardLink,
      exact: true
    })
    await expect(dashboardLink).toHaveAttribute('href', '/plant-products')

    await dashboardLink.click()

    await expect(page).toHaveURL('/plant-products')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const { all, seriousOrCritical } = await axeViolations(page)
    expect(
      seriousOrCritical,
      `Confirmation has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})
