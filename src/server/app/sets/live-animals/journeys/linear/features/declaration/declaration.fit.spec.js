import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  completeAnswerSections,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const startAtDeclaration = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const declarationUrl = page.url().replace(/\/origin$/, '/declaration')
  await answerOriginEntry(page)

  await page.goto(declarationUrl)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('declaration feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtDeclaration(page)
  })

  test('renders every declaration statement and the current date', async ({
    page
  }) => {
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
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).toBeVisible()
    await expect(
      page.getByText(new RegExp(`^${copy.dateOfDeclaration}`))
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()
  })

  test('declaration validation: when unchecked, links to and focuses the clear checkbox', async ({
    page
  }) => {
    await page.locator('form button[type="submit"]').click()

    const declarationError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.declarationRequired })
    await expect(declarationError).toBeVisible()
    await declarationError.click()
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).toBeFocused()
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).not.toBeChecked()
  })

  test('back link returns to check answers', async ({ page }) => {
    const checkAnswersUrl = page
      .url()
      .replace(/\/declaration$/, '/notification-view')
    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute(
      'href',
      new URL(checkAnswersUrl).pathname
    )

    await backLink.click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/notification-view$/)
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
      `Declaration has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

test.describe('declaration submission', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('submits a complete notification, redirects to confirmation and keeps the declaration', async ({
    page
  }) => {
    const declarationUrl = page.url()

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/confirmation$/)
    await page.goto(declarationUrl)
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/confirmation$/)
  })
})
