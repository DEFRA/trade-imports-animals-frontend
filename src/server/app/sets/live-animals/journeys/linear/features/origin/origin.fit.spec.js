import {
  BASE,
  chooseCountryOfOrigin,
  expectNoSeriousOrCriticalViolations,
  journeyUrl,
  startNotificationAtOrigin,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { expect, test } from '@playwright/test'
import {
  countriesOrigin,
  originPageCountryEntries
} from '../../../../../../services/_capture/fixtures.js'
import {
  copy as sharedCopy,
  validatorDefaults
} from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const COMMODITIES_PATH_PATTERN = '/notifications/[^/]+/commodities'
const france = countriesOrigin.find(({ code }) => code === 'FR')
const ireland = countriesOrigin.find(({ code }) => code === 'IE')

const countryInput = 'input#countryOfOrigin'
const countryHidden = 'select#countryOfOrigin-select'
const AUTOCOMPLETE_OPTION = '.autocomplete__option'

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'
const INTERNAL_REFERENCE_MAX_LENGTH = 58
const INTERNAL_REFERENCE = 'Imports456GB'
const PUNCTUATED_INTERNAL_REFERENCE = 'ACME-2026/01 batch 2.'
const OUT_OF_LIST_COUNTRY = 'XX'

const countryField = (page) =>
  page.getByLabel(copy.country.label, { exact: true })

const hubUrlOf = (originUrl) => originUrl.replace(/\/origin$/, '')

const chooseOutOfListCountry = (page) =>
  page.locator(countryHidden).evaluate((select, code) => {
    select.add(new Option(code, code))
    select.value = code
  }, OUT_OF_LIST_COUNTRY)

const fillOriginAnswers = async (page, { country = france, regionCode }) => {
  await chooseCountryOfOrigin(page, country.name)
  await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
  await page.getByLabel(copy.regionCode.label, { exact: true }).fill(regionCode)
}

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('renders the captured MDM country options and feature copy', async ({
    page
  }) => {
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
    expect(renderedCountries).toEqual(originPageCountryEntries())
  })

  test('sets all three question labels at the same medium size', async ({
    page
  }) => {
    await expect(page.locator('label[for="countryOfOrigin"]')).toHaveClass(
      /govuk-label--m/
    )
    await expect(
      page
        .getByRole('group', { name: copy.regionRequirement.legend })
        .locator('legend')
    ).toHaveClass(/govuk-fieldset__legend--m/)
    await expect(
      page.locator('label[for="internalReferenceNumber"]')
    ).toHaveClass(/govuk-label--m/)
  })

  test('shows the draft status and the notification reference before any answer is saved', async ({
    page
  }) => {
    const reference = new URL(page.url()).pathname.split('/').at(-2)

    const strip = page.locator('.app-journey-strip')
    await expect(strip).toBeVisible()
    await expect(strip).toContainText(sharedCopy.journeyStrip.draft)
    await expect(strip).toContainText(reference)
    await expect(
      strip.getByRole('link', {
        name: sharedCopy.journeyStrip.cancelAmend,
        exact: true
      })
    ).toHaveCount(0)
  })

  test('saves valid values, redirects to the next page and persists the answer', async ({
    page
  }) => {
    const originUrl = page.url()

    await fillOriginAnswers(page, { regionCode: '75' })
    await page.getByLabel(copy.internalReference.label).fill('Imports456_GB')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

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

  test('the region of origin code is still held and shown after it is made optional', async ({
    page
  }) => {
    const originUrl = page.url()

    await fillOriginAnswers(page, { regionCode: '75' })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.no })
    ).toBeChecked()
    await expect(page.locator('#regionOfOriginCodeSuffix')).toHaveValue('75')

    await page.goto(journeyUrl(page, 'notification-view'))
    await expect(
      page
        .getByRole('term')
        .filter({
          has: page.getByText(checkAnswersCopy.rows.regionCode, {
            exact: true
          })
        })
        .locator('..')
    ).toContainText('FR-75')
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

    await expectNoSeriousOrCriticalViolations(page, 'Origin with prefix')
  })

  test('back link returns to the dashboard while the journey is unanswered', async ({
    page
  }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(BASE)
  })

  test('back link returns to the notification hub once the journey has answers', async ({
    page
  }) => {
    const originUrl = page.url()
    const hubUrl = hubUrlOf(originUrl)

    await chooseCountryOfOrigin(page, france.name)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await page.goto(originUrl)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('cancel and return to overview reaches the hub on a notification with no answers', async ({
    page
  }) => {
    const hubUrl = hubUrlOf(page.url())

    await page
      .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
      .click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Origin')
  })
})

test.describe('country of origin type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('offers the whole country list on focus, without typing', async ({
    page
  }) => {
    await page.locator(countryInput).click()

    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(
      originPageCountryEntries().length
    )
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
    await chooseCountryOfOrigin(page, france.name)

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

    await expectNoSeriousOrCriticalViolations(page, 'Origin results list')
  })
})

test.describe('country of origin type-ahead styles', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('uses GOV.UK typography for the enhanced input and its options', async ({
    page
  }) => {
    const input = page.locator(countryInput)
    await input.fill('Fr')
    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()

    const typography = await page.evaluate(
      ({ inputSelector, optionSelector }) => {
        const enhancedInput = document.querySelector(inputSelector)
        const option = document.querySelector(optionSelector)
        const reference = document.createElement('input')
        reference.className = 'govuk-input'
        document.body.append(reference)

        const inputStyle = getComputedStyle(enhancedInput)
        const optionStyle = getComputedStyle(option)
        const referenceStyle = getComputedStyle(reference)
        const result = {
          inputFamily: inputStyle.fontFamily,
          inputSize: inputStyle.fontSize,
          optionFamily: optionStyle.fontFamily,
          optionSize: optionStyle.fontSize,
          referenceFamily: referenceStyle.fontFamily,
          referenceSize: referenceStyle.fontSize
        }
        reference.remove()
        return result
      },
      { inputSelector: countryInput, optionSelector: AUTOCOMPLETE_OPTION }
    )

    expect(typography.inputFamily).toBe(typography.referenceFamily)
    expect(typography.optionFamily).toBe(typography.referenceFamily)
    expect(typography.inputFamily).toMatch(/^"?GDS Transport/)
    expect(typography.inputSize).toBe(typography.referenceSize)
    expect(typography.optionSize).toBe(typography.referenceSize)
  })

  test('keeps the upstream focus indicator on the enhanced input', async ({
    page
  }) => {
    const input = page.locator(countryInput)

    await input.focus()

    const indicator = await input.evaluate((enhancedInput) => {
      const reference = document.createElement('span')
      reference.style.color = 'var(--govuk-focus-colour)'
      document.body.append(reference)
      const inputStyle = getComputedStyle(enhancedInput)
      const result = {
        boxShadow: inputStyle.boxShadow,
        focusColour: getComputedStyle(reference).color,
        outlineColour: inputStyle.outlineColor,
        outlineWidth: inputStyle.outlineWidth
      }
      reference.remove()
      return result
    })

    expect(indicator.outlineColour).toBe(indicator.focusColour)
    expect(indicator.outlineWidth).toBe('3px')
    expect(indicator.boxShadow).toContain('inset')
  })

  test('gives the enhanced input the standard GOV.UK error border', async ({
    page
  }) => {
    await chooseOutOfListCountry(page)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryFromList
      })
    ).toBeVisible()

    const borders = await page.evaluate((inputSelector) => {
      const enhancedInput = document.querySelector(inputSelector)
      const errorMessage = document.querySelector('#countryOfOrigin-error')
      const reference = document.createElement('input')
      reference.className = 'govuk-input govuk-input--error'
      document.body.append(reference)

      const inputStyle = getComputedStyle(enhancedInput)
      const errorStyle = getComputedStyle(errorMessage)
      const referenceStyle = getComputedStyle(reference)
      const result = {
        inputColour: inputStyle.borderTopColor,
        inputWidth: inputStyle.borderTopWidth,
        errorColour: errorStyle.color,
        referenceColour: referenceStyle.borderTopColor,
        referenceWidth: referenceStyle.borderTopWidth
      }
      reference.remove()
      return result
    }, countryInput)

    expect(borders.inputColour).toBe(borders.errorColour)
    expect(borders.inputColour).toBe(borders.referenceColour)
    expect(borders.inputWidth).toBe(borders.referenceWidth)
  })
})

test.describe('country of origin without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('native select submits and persists the country code', async ({
    page
  }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
    const originUrl = page.url()

    await countryField(page).selectOption(france.code)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))
    await page.goto(originUrl)
    await expect(page.locator('select#countryOfOrigin')).toHaveValue(
      france.code
    )
  })
})

test.describe('origin country and region validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('country: an unanswered country saves the rest of the page and moves on', async ({
    page
  }) => {
    const originUrl = page.url()

    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.getByLabel(copy.internalReference.label).fill(INTERNAL_REFERENCE)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(hubUrlOf(originUrl))

    await page.goto(originUrl)
    await expect(page.locator(countryHidden)).toHaveValue('')
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.no })
    ).toBeChecked()
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      INTERNAL_REFERENCE
    )
  })

  test('country: an unanswered country leaves the origin task unfinished', async ({
    page
  }) => {
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const originRow = page.getByRole('listitem').filter({
      has: page.getByText(hubCopy.rows.origin.title, { exact: true })
    })
    await expect(originRow).toContainText(hubCopy.statuses.toDo)
    await expect(originRow).not.toContainText(hubCopy.statuses.complete)
  })

  test('country validation: an out-of-list country links to and focuses the cleared field', async ({
    page
  }) => {
    await chooseOutOfListCountry(page)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryFromList })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.locator(countryInput)).toBeFocused()
    await expect(page.locator(countryInput)).toHaveValue('')
    await expect(page.locator(countryHidden)).toHaveValue('')
  })

  test('out-of-list country error page has no serious or critical axe violations', async ({
    page
  }) => {
    await chooseOutOfListCountry(page)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Origin out-of-list country error'
    )
  })

  test('region requirement validation: when the submitted option is invalid, links to and focuses the group', async ({
    page
  }) => {
    await chooseCountryOfOrigin(page, france.name)
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

  test('region code validation: when Yes is chosen and the box is empty, holds the user on the page', async ({
    page
  }) => {
    const originUrl = page.url()
    await chooseCountryOfOrigin(page, france.name)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(originUrl)
    const regionCodeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.regionCodeRequired })
    await expect(regionCodeError).toBeVisible()
    await regionCodeError.click()
    await expect(
      page.getByLabel(copy.regionCode.label, { exact: true })
    ).toBeFocused()
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
  })

  test('region code validation: No leaves the empty box unasked for', async ({
    page
  }) => {
    await chooseCountryOfOrigin(page, france.name)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))
  })

  test('empty region code error page has no serious or critical axe violations', async ({
    page
  }) => {
    await chooseCountryOfOrigin(page, france.name)
    await page.getByRole('radio', { name: copy.regionRequirement.yes }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Origin empty region code error'
    )
  })

  test('region code validation: when over 5 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    await chooseCountryOfOrigin(page, france.name)
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
    await startNotificationAtOrigin(page)
  })

  test('internal reference validation: when over 58 characters, links to and focuses the preserved value', async ({
    page
  }) => {
    const invalidReference = 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1)
    await chooseCountryOfOrigin(page, france.name)
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

  test('internal reference validation: saves a reference punctuated the way the user holds it', async ({
    page
  }) => {
    const originUrl = page.url()

    await chooseCountryOfOrigin(page, france.name)
    await page
      .getByLabel(copy.internalReference.label)
      .fill(PUNCTUATED_INTERNAL_REFERENCE)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      PUNCTUATED_INTERNAL_REFERENCE
    )
  })
})
