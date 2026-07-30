import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { countriesOrigin } from '../../services/_capture/fixtures.js'
import { copy } from './copy/copy.en.js'

const startAtDestinationCountry = async (page) => {
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
  await page.locator('input[name="reasonForImport"][value="transit"]').check()
  await page.locator('form button[type="submit"]').first().click()
  await page.goto(reasonUrl.replace(/\/import-reason$/, '/destination-country'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('destination-country feature', () => {
  test('renders the captured country options, feature copy and working back link', async ({
    page
  }) => {
    await startAtDestinationCountry(page)

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

    const hubUrl = page.url().replace(/\/destination-country$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('shows the required validation rule', async ({ page }) => {
    await startAtDestinationCountry(page)

    await saveAndContinue(page)

    await expect(errorLink(page, copy.errors.countryRequired)).toBeVisible()
    await expect(page.getByLabel(copy.country.label)).toHaveValue('')
  })

  test('saves a valid country, redirects and persists the answer', async ({
    page
  }) => {
    await startAtDestinationCountry(page)
    const destinationUrl = page.url()
    const france = countriesOrigin.find(({ code }) => code === 'FR')

    await page.getByLabel(copy.country.label).selectOption(france.code)
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(destinationUrl)
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.code)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtDestinationCountry(page)

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
