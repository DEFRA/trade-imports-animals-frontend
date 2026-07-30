import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtExitDate = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await page.goto(reasonUrl)
  await page
    .locator('input[name="reasonForImport"][value="temporaryAdmissionHorses"]')
    .check()
  await page.locator('form button[type="submit"]').first().click()

  const portUrl = reasonUrl.replace(/\/import-reason$/, '/port-of-exit')
  await page.goto(portUrl)
  await page.getByLabel('Port of exit').selectOption('GB ABD')
  await page.locator('form button[type="submit"]').first().click()
  await page.goto(portUrl.replace(/\/port-of-exit$/, '/exit-date'))
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/exit-date$/)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const dateInput = (page, part) => page.locator(`input[name="exitDate-${part}"]`)

test.describe('exit-date feature', () => {
  test('renders the date copy and working back link', async ({ page }) => {
    await startAtExitDate(page)

    await expect(
      page.getByRole('group', { name: copy.date.label })
    ).toContainText(copy.date.hint)
    await expect(dateInput(page, 'day')).toBeVisible()
    await expect(dateInput(page, 'month')).toBeVisible()
    await expect(dateInput(page, 'year')).toBeVisible()

    const hubUrl = page.url().replace(/\/exit-date$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('rejects partial and unreal dates while preserving every entered part', async ({
    page
  }) => {
    await startAtExitDate(page)

    await dateInput(page, 'day').fill('27')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.dateInvalid)).toBeVisible()
    await expect(dateInput(page, 'day')).toHaveValue('27')
    await expect(dateInput(page, 'month')).toHaveValue('')
    await expect(dateInput(page, 'year')).toHaveValue('')

    await dateInput(page, 'month').fill('2')
    await dateInput(page, 'year').fill('2026')
    await dateInput(page, 'day').fill('31')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.dateInvalid)).toBeVisible()
    await expect(dateInput(page, 'day')).toHaveValue('31')
    await expect(dateInput(page, 'month')).toHaveValue('2')
    await expect(dateInput(page, 'year')).toHaveValue('2026')
  })

  test('saves a real date, redirects and persists every date part', async ({
    page
  }) => {
    await startAtExitDate(page)
    const exitDateUrl = page.url()

    await dateInput(page, 'day').fill('27')
    await dateInput(page, 'month').fill('3')
    await dateInput(page, 'year').fill('2026')
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(exitDateUrl)
    await expect(dateInput(page, 'day')).toHaveValue('27')
    await expect(dateInput(page, 'month')).toHaveValue('3')
    await expect(dateInput(page, 'year')).toHaveValue('2026')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtExitDate(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Exit date has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
