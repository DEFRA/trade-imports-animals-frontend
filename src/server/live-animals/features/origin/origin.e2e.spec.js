import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { countriesOrigin } from '../../services/_capture/fixtures.js'
import { copy } from './copy/copy.en.js'

const france = countriesOrigin.find(({ code }) => code === 'FR')

const startAtOrigin = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()

  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const chooseCountry = async (page, country) => {
  const combo = page.locator('input#countryOfOrigin')
  await combo.fill(country.name)
  await page.getByRole('option', { name: country.name, exact: true }).click()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

test.describe('origin feature', () => {
  test('renders the captured MDM country options, feature copy and working back link', async ({
    page
  }) => {
    await startAtOrigin(page)

    await expect(page.getByLabel(copy.country.label)).toBeVisible()
    await expect(
      page.getByRole('group', { name: copy.regionRequirement.legend })
    ).toContainText(copy.regionRequirement.hint)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.no })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.internalReference.label)
    ).toHaveAccessibleDescription(copy.internalReference.hint)

    const select = page.locator('select#countryOfOrigin-select')
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

    const hubUrl = page.url().replace(/\/origin$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('shows every controller validation rule and preserves submitted values', async ({
    page
  }) => {
    await startAtOrigin(page)

    await saveAndContinue(page)
    await expect(errorLink(page, copy.errors.countryRequired)).toBeVisible()

    await chooseCountry(page, france)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('ABCDEF')
    await page.getByLabel(copy.internalReference.label).fill('A'.repeat(59))
    await saveAndContinue(page)

    await expect(errorLink(page, copy.errors.regionCodeMaxLength)).toBeVisible()
    await expect(
      errorLink(page, copy.errors.internalReferenceMaxLength)
    ).toBeVisible()
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.name)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()

    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('FR-75')
    await page.getByLabel(copy.internalReference.label).fill('bad ref!')
    await saveAndContinue(page)
    await expect(
      errorLink(page, copy.errors.internalReferencePattern)
    ).toBeVisible()
  })

  test('saves valid values, redirects to the next page and persists the answer', async ({
    page
  }) => {
    await startAtOrigin(page)
    const originUrl = page.url()

    await chooseCountry(page, france)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('FR-75')
    await page.getByLabel(copy.internalReference.label).fill('Imports456_GB')
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodities$/)

    await page.goto(originUrl)
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.name)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toHaveValue('FR-75')
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      'Imports456_GB'
    )
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtOrigin(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations
      .filter(({ impact }) => ['serious', 'critical'].includes(impact))
      .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

    expect(
      seriousOrCritical,
      `Origin has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
