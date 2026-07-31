import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtCphNumber = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const commodityUrl = page.url().replace(/\/origin$/, '/commodities')
  await page.goto(commodityUrl)
  await page.getByRole('checkbox', { name: 'Bos taurus' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/consignment-details$/)

  await page.goto(commodityUrl.replace(/\/commodities$/, '/cph-number'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('cph-number feature', () => {
  test('renders the CPH copy and working back link', async ({ page }) => {
    await startAtCphNumber(page)

    await expect(page.getByLabel(copy.cph.label)).toHaveAccessibleDescription(
      copy.cph.hint
    )

    const hubUrl = page.url().replace(/\/cph-number$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('shows every CPH validation rule and preserves the raw submitted value', async ({
    page
  }) => {
    await startAtCphNumber(page)
    const input = page.getByLabel(copy.cph.label)

    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.cphRequired)).toBeVisible()

    await input.fill('12/345/678')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.cphLength)).toBeVisible()
    await expect(input).toHaveValue('12/345/678')

    await input.fill('12345678A')
    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.cphDigitsOnly)).toBeVisible()
    await expect(input).toHaveValue('12345678A')
  })

  test('strips slashes, saves a valid CPH number, redirects and persists it', async ({
    page
  }) => {
    await startAtCphNumber(page)
    const cphUrl = page.url()

    await page.getByLabel(copy.cph.label).fill('123/456/789')
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(cphUrl)
    await expect(page.getByLabel(copy.cph.label)).toHaveValue('123456789')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtCphNumber(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `CPH number has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
