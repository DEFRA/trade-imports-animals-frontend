import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const startAtDeclaration = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  await page.goto(page.url().replace(/\/origin$/, '/declaration'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const continueJourney = (page) =>
  page.locator('form button[type="submit"]').click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const declarationCheckbox = (page) =>
  page.getByRole('checkbox', { name: copy.declarationLabel })

test.describe('declaration feature', () => {
  test('renders every declaration statement, the current date and working back link', async ({
    page
  }) => {
    await startAtDeclaration(page)

    await expect(
      page.getByRole('heading', { name: copy.body.contactUk })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.body.responsible })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.body.accountableFor })
    ).toBeVisible()
    for (const item of copy.body.accountableItems) {
      await expect(page.getByText(item, { exact: true })).toBeVisible()
    }
    await expect(page.getByText(copy.body.authorised)).toBeVisible()
    await expect(page.getByText(copy.body.legallyAct)).toBeVisible()
    await expect(declarationCheckbox(page)).toBeVisible()
    await expect(
      page.getByText(new RegExp(`^${copy.dateOfDeclaration}`))
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()

    const checkAnswersUrl = page
      .url()
      .replace(/\/declaration$/, '/notification-view')
    await expect(page.locator('.govuk-back-link')).toHaveAttribute(
      'href',
      new URL(checkAnswersUrl).pathname
    )
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/notification-view$/)
  })

  test('shows the required validation rule and leaves the checkbox clear', async ({
    page
  }) => {
    await startAtDeclaration(page)

    await continueJourney(page)

    await expect(errorLink(page, copy.errors.declarationRequired)).toBeVisible()
    await expect(declarationCheckbox(page)).not.toBeChecked()
  })

  test('submits a complete notification, redirects to confirmation and keeps the declaration', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    const declarationUrl = page.url()

    await declarationCheckbox(page).check()
    await continueJourney(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/confirmation$/)
    await page.goto(declarationUrl)
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/confirmation$/)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtDeclaration(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Declaration has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
