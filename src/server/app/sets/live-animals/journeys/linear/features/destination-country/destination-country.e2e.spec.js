import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { countriesOrigin } from '../../../../../../services/_capture/fixtures.js'
import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'

const startAtDestinationCountry = async (page) => {
  await page.goto('/live-animals')
  await page
    .locator('form[action="/live-animals/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL((url) =>
    /^\/live-animals\/notifications\/[^/]+\/origin$/.test(url.pathname)
  )

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await page.goto(reasonUrl)
  await page.locator('input[name="reasonForImport"][value="transit"]').check()
  await page.locator(SUBMIT_BUTTON).first().click()
  await page.goto(reasonUrl.replace(/\/import-reason$/, '/destination-country'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('destination-country feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDestinationCountry(page)
  })

  test('renders the captured country options and feature copy', async ({
    page
  }) => {
    await expect(
      page.getByLabel(copy.country.label)
    ).toHaveAccessibleDescription(copy.country.hint)
    const select = page.locator('select#destinationCountry')
    await expect(select.locator('option').first()).toHaveText(
      copy.country.placeholder
    )
    const renderedCountries = await select
      .locator('option')
      .evaluateAll((options) =>
        options.slice(2).map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )
    expect(renderedCountries).toEqual(countriesOrigin)
  })

  test('country validation: when no country is selected, links to and focuses the empty select', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON).first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.getByLabel(copy.country.label)).toBeFocused()
    await expect(page.getByLabel(copy.country.label)).toHaveValue('')
  })

  test('saves a valid country, redirects and persists the answer', async ({
    page
  }) => {
    const destinationUrl = page.url()
    const france = countriesOrigin.find(({ code }) => code === 'FR')

    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+$/.test(url.pathname)
    )
    await page.goto(destinationUrl)
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.code)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/destination-country$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
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
      `Destination country has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
