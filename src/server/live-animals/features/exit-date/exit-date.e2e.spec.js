import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { chooseTodayFromDatePicker } from '../../../../../e2e/live-animals-journey.js'
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

const dateInput = (page) => page.getByLabel(copy.date.label)

test.describe('exit-date feature', () => {
  test('renders the date copy and working back link', async ({ page }) => {
    await startAtExitDate(page)

    await expect(dateInput(page)).toHaveAccessibleDescription(copy.date.hint)
    await expect(dateInput(page)).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Choose date' })
    ).toBeVisible()

    const hubUrl = page.url().replace(/\/exit-date$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('rejects partial and unreal directly typed dates while preserving the input', async ({
    page
  }) => {
    await startAtExitDate(page)

    await dateInput(page).fill('27/')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.dateInvalid)).toBeVisible()
    await expect(dateInput(page)).toHaveValue('27/')

    await dateInput(page).fill('31/2/2026')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.dateInvalid)).toBeVisible()
    await expect(dateInput(page)).toHaveValue('31/2/2026')
  })

  test('selects a date in the calendar, redirects and persists it', async ({
    page
  }) => {
    await startAtExitDate(page)
    const exitDateUrl = page.url()

    const selected = await chooseTodayFromDatePicker(page, copy.date.label)
    await expect(dateInput(page)).toHaveValue(selected)
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(exitDateUrl)
    await expect(dateInput(page)).toHaveValue(selected)
  })

  test('has no serious or critical axe violations with the picker dialog open', async ({
    page
  }) => {
    await startAtExitDate(page)
    await page.getByRole('button', { name: 'Choose date' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

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

test.describe('exit-date feature without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('accepts a directly typed dd/mm/yyyy date and persists it', async ({
    page
  }) => {
    await startAtExitDate(page)
    await dateInput(page).fill('27/3/2026')
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(`${page.url()}/exit-date`)
    await expect(dateInput(page)).toHaveValue('27/3/2026')
    await expect(page.getByRole('button', { name: 'Choose date' })).toHaveCount(
      0
    )
  })
})
