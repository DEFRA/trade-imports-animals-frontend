import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { countriesOrigin } from '../../../../../../services/_capture/fixtures.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const france = countriesOrigin.find(({ code }) => code === 'FR')

const startAtOrigin = async (page) => {
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
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtOrigin(page)
  })

  test('renders the captured MDM country options and feature copy', async ({
    page
  }) => {
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

    const select = page.locator('select#countryOfOrigin')
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
    await page.locator('form button[type="submit"]').first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.getByLabel(copy.country.label)).toBeFocused()
    await expect(page.getByLabel(copy.country.label)).toHaveValue('')
  })

  test('validation error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations
      .filter(({ impact }) => ['serious', 'critical'].includes(impact))
      .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

    expect(
      seriousOrCritical,
      `Origin validation error has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })

  test('region requirement validation: when the submitted option is invalid, links to and focuses the group', async ({
    page
  }) => {
    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page
      .locator('input[name="regionOfOriginCodeRequirement"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-requirement'
        input.checked = true
      })
    await page.locator('form button[type="submit"]').first().click()

    const requirementError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(requirementError).toBeVisible()
    await requirementError.click()
    await expect(
      page.locator('input[name="regionOfOriginCodeRequirement"]').first()
    ).toBeFocused()
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.code)
    await expect(
      page.locator('input[name="regionOfOriginCodeRequirement"]:checked')
    ).toHaveCount(0)
  })

  test('region code validation: when over 5 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('ABCDEF')
    await page.locator('form button[type="submit"]').first().click()

    const regionCodeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.regionCodeMaxLength })
    await expect(regionCodeError).toBeVisible()
    await regionCodeError.click()
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toBeFocused()
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toHaveValue('ABCDEF')
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.code)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
  })

  test('internal reference validation: when over 58 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    const invalidReference = 'A'.repeat(59)
    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page.getByLabel(copy.internalReference.label).fill(invalidReference)
    await page.locator('form button[type="submit"]').first().click()

    const referenceError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.internalReferenceMaxLength })
    await expect(referenceError).toBeVisible()
    await referenceError.click()
    await expect(page.getByLabel(copy.internalReference.label)).toBeFocused()
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      invalidReference
    )
  })

  test('internal reference validation: when characters are invalid, links to and focuses the preserved value', async ({
    page
  }) => {
    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page.getByLabel(copy.internalReference.label).fill('bad ref!')
    await page.locator('form button[type="submit"]').first().click()

    const referenceError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.internalReferencePattern })
    await expect(referenceError).toBeVisible()
    await referenceError.click()
    await expect(page.getByLabel(copy.internalReference.label)).toBeFocused()
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      'bad ref!'
    )
  })

  test('saves valid values, redirects to the next page and persists the answer', async ({
    page
  }) => {
    const originUrl = page.url()

    await page.getByLabel(copy.country.label).selectOption(france.code)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('FR-75')
    await page.getByLabel(copy.internalReference.label).fill('Imports456_GB')
    await page.locator('form button[type="submit"]').first().click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/commodities$/.test(url.pathname)
    )

    await page.goto(originUrl)
    await expect(page.getByLabel(copy.country.label)).toHaveValue(france.code)
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

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/origin$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
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
