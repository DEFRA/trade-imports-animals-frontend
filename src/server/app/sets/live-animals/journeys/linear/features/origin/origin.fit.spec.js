import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { countriesOrigin } from '../../../../../../services/_capture/fixtures.js'
import {
  copy as sharedCopy,
  validatorDefaults
} from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const france = countriesOrigin.find(({ code }) => code === 'FR')
const ireland = countriesOrigin.find(({ code }) => code === 'IE')

// accessible-autocomplete enhances the native <select>: the visible combobox
// input keeps the original id and holds the country name, and the native select
// is hidden and renamed with a "-select" suffix (it still submits the code).
const countryInput = 'input#countryOfOrigin'
const countryHidden = 'select#countryOfOrigin-select'

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'
const INTERNAL_REFERENCE_MAX_LENGTH = 58

const countryField = (page) =>
  page.getByLabel(copy.country.label, { exact: true })

const startAtOrigin = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

// Pick a country from the enhanced type-ahead, the way a user does: type part
// of the name to filter, then pick the match. The combobox is addressed by its
// own selector rather than by label, because the label points at the native
// select until the client bundle has swapped the type-ahead in.
const chooseCountry = async (page, { name }) => {
  const field = page.locator(countryInput)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const fillOriginAnswers = async (page, { country = france, regionCode }) => {
  await chooseCountry(page, country)
  await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
  await page.getByLabel(copy.regionCode.label, { exact: true }).fill(regionCode)
}

const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

const expectNoSeriousOrCriticalAxeViolations = async (page, pageName) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

  expect(
    seriousOrCritical,
    `${pageName} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtOrigin(page)
  })

  test('renders the captured MDM country options and feature copy', async ({
    page
  }) => {
    // The enhancement has run once the native select has been renamed, and the
    // country label then names the search box rather than the select.
    await expect(page.locator(countryHidden)).toBeAttached()
    await expect(countryField(page)).toHaveAttribute('role', 'combobox')
    await expect(page.getByText(copy.country.hint)).toBeVisible()
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

    const select = page.locator(countryHidden)
    await expect(select.locator('option').first()).toHaveText(
      copy.country.placeholder
    )
    const renderedCountries = await select
      .locator('option')
      .evaluateAll((options) =>
        options.slice(1).map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )
    expect(renderedCountries).toEqual(countriesOrigin)
  })

  test('saves valid values, redirects to the next page and persists the answer', async ({
    page
  }) => {
    const originUrl = page.url()

    await fillOriginAnswers(page, { regionCode: '75' })
    await page.getByLabel(copy.internalReference.label).fill('Imports456_GB')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodities$/)

    await page.goto(originUrl)
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
    await expect(page.locator(countryInput)).toHaveValue(france.name)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toHaveValue('75')
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      'Imports456_GB'
    )
  })

  test('shows the country already chosen as a fixed prefix beside the region code box', async ({
    page
  }) => {
    const originUrl = page.url()

    await fillOriginAnswers(page, { regionCode: '75' })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await page.goto(originUrl)

    const prefix = page.locator('.govuk-input__prefix')
    await expect(prefix).toHaveText(france.code)
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toHaveValue('75')
  })

  test('the prefix follows the country the user chose', async ({ page }) => {
    const originUrl = page.url()
    await fillOriginAnswers(page, { country: ireland, regionCode: '75' })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await page.goto(originUrl)

    await expect(page.locator('.govuk-input__prefix')).toHaveText(ireland.code)
  })

  test('region code prefix has no serious or critical axe violations', async ({
    page
  }) => {
    const originUrl = page.url()

    await fillOriginAnswers(page, { regionCode: '75' })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await page.goto(originUrl)

    await expectNoSeriousOrCriticalAxeViolations(page, 'Origin with prefix')
  })

  test('back link returns to the dashboard while the journey is unanswered', async ({
    page
  }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL('/')
  })

  test('back link returns to the notification hub once the journey has answers', async ({
    page
  }) => {
    const originUrl = page.url()
    const hubUrl = originUrl.replace(/\/origin$/, '')

    await chooseCountry(page, france)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await page.goto(originUrl)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('cancel and return to hub reaches the hub on a notification with no answers', async ({
    page
  }) => {
    const hubUrl = page.url().replace(/\/origin$/, '')

    await page
      .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
      .click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(page, 'Origin')
  })
})

test.describe('country of origin type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtOrigin(page)
  })

  test('offers the whole country list on focus, without typing', async ({
    page
  }) => {
    await page.locator(countryInput).click()

    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(countriesOrigin.length)
  })

  test('filters the list as the user types, case-insensitively', async ({
    page
  }) => {
    const field = page.locator(countryInput)

    await field.fill('fran')
    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(1)

    await field.fill('IRELAND')
    await expect(
      page.getByRole('option', { name: ireland.name, exact: true })
    ).toBeVisible()
  })

  test('leaves the chosen country visible in the box and submits its code', async ({
    page
  }) => {
    await chooseCountry(page, france)

    await expect(page.locator(countryInput)).toHaveValue(france.name)
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
  })

  test('tells the user when nothing matches what they typed', async ({
    page
  }) => {
    await page.locator(countryInput).fill('zzzzzz')

    await expect(page.getByText(copy.country.noResults)).toBeVisible()
  })

  test('open results list has no serious or critical axe violations', async ({
    page
  }) => {
    await page.locator(countryInput).fill('fran')
    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page, 'Origin results list')
  })
})

test.describe('country of origin without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('native select submits and persists the country code', async ({
    page
  }) => {
    await signIn(page)
    await startAtOrigin(page)
    const originUrl = page.url()

    await countryField(page).selectOption(france.code)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodities$/)
    await page.goto(originUrl)
    await expect(page.locator('select#countryOfOrigin')).toHaveValue(
      france.code
    )
  })
})

test.describe('origin country and region validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtOrigin(page)
  })

  test('country validation: when no country is chosen, links to and focuses the empty field', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.locator(countryInput)).toBeFocused()
    await expect(page.locator(countryInput)).toHaveValue('')
    await expect(page.locator(countryHidden)).toHaveValue('')
  })

  test('validation error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Origin validation error'
    )
  })

  test('region requirement validation: when the submitted option is invalid, links to and focuses the group', async ({
    page
  }) => {
    await chooseCountry(page, france)
    await page
      .locator('input[name="regionOfOriginCodeRequirement"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-requirement'
        input.checked = true
      })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const requirementError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(requirementError).toBeVisible()
    await requirementError.click()
    await expect(
      page.locator('input[name="regionOfOriginCodeRequirement"]').first()
    ).toBeFocused()
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
    await expect(
      page.locator('input[name="regionOfOriginCodeRequirement"]:checked')
    ).toHaveCount(0)
  })

  test('region code validation: when over 5 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    await chooseCountry(page, france)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.getByLabel(copy.regionCode.label, { exact: true }).fill('ABCDEF')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

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
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
    await expect(page.locator(countryInput)).toHaveValue(france.name)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
  })
})

test.describe('origin internal reference validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtOrigin(page)
  })

  test('internal reference validation: when over 58 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    const invalidReference = 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1)
    await chooseCountry(page, france)
    await page.getByLabel(copy.internalReference.label).fill(invalidReference)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

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
    await chooseCountry(page, france)
    await page.getByLabel(copy.internalReference.label).fill('bad ref!')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

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
})
