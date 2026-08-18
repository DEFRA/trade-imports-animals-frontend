import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { answerOriginEntry } from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'
const CHOOSE_DATE_LABEL = 'Choose date'

const startAtExitDate = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await answerOriginEntry(page)

  await page.goto(reasonUrl)
  await page
    .locator('input[name="reasonForImport"][value="temporaryAdmissionHorses"]')
    .check()
  await page.locator(SUBMIT_BUTTON).first().click()

  const portUrl = reasonUrl.replace(/\/import-reason$/, '/port-of-exit')
  await page.goto(portUrl)
  await page.getByLabel('Port of exit').selectOption('GB ABD')
  await page.locator(SUBMIT_BUTTON).first().click()
  await page.goto(portUrl.replace(/\/port-of-exit$/, '/exit-date'))
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/exit-date$/)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const todayInPicker = (page) =>
  page.evaluate(() => {
    const date = new Date()
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ]
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    return {
      accessibleName: `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
      inputValue: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    }
  })

test.describe('exit-date feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtExitDate(page)
  })

  test('renders the MoJ date picker and feature copy', async ({ page }) => {
    await expect(page.getByLabel(copy.date.label)).toHaveAccessibleDescription(
      copy.date.hint
    )
    await expect(page.getByLabel(copy.date.label)).toBeVisible()
    await expect(
      page.getByRole('button', { name: CHOOSE_DATE_LABEL })
    ).toBeVisible()
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/exit-date$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('date validation: when partially entered, links to and focuses the preserved input', async ({
    page
  }) => {
    await page.getByLabel(copy.date.label).fill('27/')
    await page.locator(SUBMIT_BUTTON).first().click()

    const dateError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.dateInvalid })
    await expect(dateError).toBeVisible()
    await dateError.click()
    await expect(page.getByLabel(copy.date.label)).toBeFocused()
    await expect(page.getByLabel(copy.date.label)).toHaveValue('27/')
  })

  test('date validation: when not a real date, links to and focuses the preserved input', async ({
    page
  }) => {
    await page.getByLabel(copy.date.label).fill('31/2/2026')
    await page.locator(SUBMIT_BUTTON).first().click()

    const dateError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.dateInvalid })
    await expect(dateError).toBeVisible()
    await dateError.click()
    await expect(page.getByLabel(copy.date.label)).toBeFocused()
    await expect(page.getByLabel(copy.date.label)).toHaveValue('31/2/2026')
  })
})

test.describe('exit-date date picker', () => {
  test.beforeEach(async ({ page }) => {
    await startAtExitDate(page)
  })

  test('selects a date in the calendar, redirects and persists it', async ({
    page
  }) => {
    const exitDateUrl = page.url()
    const today = await todayInPicker(page)

    await page.getByRole('button', { name: CHOOSE_DATE_LABEL }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: today.accessibleName, exact: true })
      .click()
    await expect(page.getByLabel(copy.date.label)).toHaveValue(today.inputValue)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(exitDateUrl)
    await expect(page.getByLabel(copy.date.label)).toHaveValue(today.inputValue)
  })

  test('has no serious or critical axe violations with the picker dialog open', async ({
    page
  }) => {
    await page.getByRole('button', { name: CHOOSE_DATE_LABEL }).click()
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

  test.beforeEach(async ({ page }) => {
    await startAtExitDate(page)
  })

  test('accepts a directly typed dd/mm/yyyy date and persists it', async ({
    page
  }) => {
    await page.getByLabel(copy.date.label).fill('27/3/2026')
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(`${page.url()}/exit-date`)
    await expect(page.getByLabel(copy.date.label)).toHaveValue('27/3/2026')
    await expect(
      page.getByRole('button', { name: CHOOSE_DATE_LABEL })
    ).toHaveCount(0)
  })
})
