import {
  BASE,
  FORM_GROUP_ANCESTOR_XPATH,
  answerOriginDetails,
  childTagsAndClassesOf,
  chooseCountryOfOrigin,
  expectNoSeriousOrCriticalViolations,
  expectedFormGroupChildren,
  journeyUrl,
  renderedCountriesIn,
  startNotificationAtOrigin,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { expect, test } from '@playwright/test'
import {
  countriesOrigin,
  countryAndSubdivisionEntriesNamedWithCountry
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
const NOTIFICATION_VIEW_PAGE = 'notification-view'
const france = countriesOrigin.find(({ code }) => code === 'FR')
const ireland = countriesOrigin.find(({ code }) => code === 'IE')
const netherlands = countriesOrigin.find(({ code }) => code === 'NL')

const countryInput = 'input#countryOfOrigin'
const countryHidden = 'select#countryOfOrigin-select'
const AUTOCOMPLETE_OPTION = '.autocomplete__option'
const REGION_CODE_PREFIX = '.govuk-input__prefix'
const CANARY_ISLANDS_LABEL = 'Canary Islands (Spain)'

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'
const INTERNAL_REFERENCE_MAX_LENGTH = 58
const INTERNAL_REFERENCE = 'Imports456GB'
const PUNCTUATED_INTERNAL_REFERENCE = 'ACME-2026/01 batch 2.'
const OUT_OF_LIST_COUNTRY = 'XX'

const countryField = (page) =>
  page.getByLabel(copy.country.label, { exact: true })

const regionCodeField = (page) =>
  page.getByLabel(copy.regionCode.label, { exact: true })

const regionCodeOnReview = (page) =>
  page
    .getByRole('term')
    .filter({
      has: page.getByText(checkAnswersCopy.rows.regionCode, { exact: true })
    })
    .locator('..')

const removeRegionCodeCap = (page) =>
  regionCodeField(page).evaluate((input) => input.removeAttribute('maxlength'))

const hubUrlOf = (originUrl) => originUrl.replace(/\/origin$/, '')

const chooseOutOfListCountry = (page, code = OUT_OF_LIST_COUNTRY) =>
  page.locator(countryHidden).evaluate((select, outOfListCode) => {
    select.add(new Option(outOfListCode, outOfListCode))
    select.value = outOfListCode
  }, code)

const regionCodePrefix = (page) => page.locator(REGION_CODE_PREFIX)

const expectRegionCodePrefix = async (page, code) => {
  await expect(regionCodePrefix(page)).toBeVisible()
  await expect(regionCodePrefix(page)).toHaveText(code)
}

const expectNoRegionCodePrefix = async (page) => {
  await expect(regionCodePrefix(page)).toHaveCount(1)
  await expect(regionCodePrefix(page)).toBeHidden()
}

const reopenOriginAfterSaving = async (page, details = {}) => {
  const originUrl = page.url()
  await answerOriginDetails(page, { regionCode: '75', ...details })
  await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))
  await page.goto(originUrl)
  return originUrl
}

const submitRefusedOriginWithFrance = async (page) => {
  await chooseCountryOfOrigin(page, france.name)
  await chooseYesForRegionCode(page)
  await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
  await expect(page.getByRole('alert')).toBeVisible()
}

const chooseYesForRegionCode = (page) =>
  page.getByRole('radio', { name: copy.regionRequirement.yes }).check()

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
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.no })
    ).toBeVisible()

    const select = page.locator(countryHidden)
    await expect(select.locator('option').first()).toHaveText(
      copy.country.selectText
    )
    expect(await renderedCountriesIn(select)).toEqual(
      countryAndSubdivisionEntriesNamedWithCountry()
    )
  })

  test('shows no hint under the country question and invites a search in the empty box', async ({
    page
  }) => {
    await expect(page.locator(countryInput)).toHaveAttribute(
      'placeholder',
      copy.country.searchPlaceholder
    )
    expect(
      await childTagsAndClassesOf(
        page.locator(countryInput).locator(FORM_GROUP_ANCESTOR_XPATH)
      )
    ).toEqual(expectedFormGroupChildren({ labelSize: 'm', enhanced: true }))
  })

  test("shows the region question's health-certificate hint and an internal reference hint with no length limit", async ({
    page
  }) => {
    await expect(
      page.getByRole('group', { name: copy.regionRequirement.legend })
    ).toHaveAccessibleDescription(copy.regionRequirement.hint)
    await expect(
      page.getByLabel(copy.internalReference.label)
    ).toHaveAccessibleDescription(copy.internalReference.hint)
  })

  test('names each territory with its country', async ({ page }) => {
    const labels = (await renderedCountriesIn(page.locator(countryHidden))).map(
      ({ name }) => name
    )

    expect(labels).toContain(CANARY_ISLANDS_LABEL)
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

    await answerOriginDetails(page, {
      regionCode: '75',
      internalReference: 'Imports456_GB'
    })
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await expect(page.locator(countryHidden)).toHaveValue(france.code)
    await expect(page.locator(countryInput)).toHaveValue(france.name)
    await expect(
      page.getByRole('radio', { name: copy.regionRequirement.yes })
    ).toBeChecked()
    await expect(regionCodeField(page)).toHaveValue('75')
    await expect(page.getByLabel(copy.internalReference.label)).toHaveValue(
      'Imports456_GB'
    )
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

test.describe('origin region of origin code and internal reference', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('sets the revealed region code label small and the internal reference box to the full column width', async ({
    page
  }) => {
    await chooseYesForRegionCode(page)

    await expect(
      page.locator('label[for="regionOfOriginCodeSuffix"]')
    ).toHaveAttribute('class', 'govuk-label govuk-label--s')
    await expect(page.locator('#internalReferenceNumber')).toHaveAttribute(
      'class',
      'govuk-input'
    )
  })

  test('the region code box stops typing at five characters, with autocomplete and spellcheck off', async ({
    page
  }) => {
    await chooseYesForRegionCode(page)
    const box = regionCodeField(page)

    await box.pressSequentially('ABCDEFG')

    await expect(box).toHaveValue('ABCDE')
    await expect(box).toHaveAttribute('autocomplete', 'off')
    await expect(box).toHaveAttribute('spellcheck', 'false')
  })

  test('answering No clears a saved region code: the review shows Not applicable and Yes shows an empty box', async ({
    page
  }) => {
    const originUrl = page.url()

    await answerOriginDetails(page, { regionCode: '75' })
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await page.getByRole('radio', { name: copy.regionRequirement.no }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_PAGE))
    await expect(regionCodeOnReview(page)).toContainText(
      checkAnswersCopy.notApplicable
    )

    await page.goto(originUrl)
    await chooseYesForRegionCode(page)
    await expect(regionCodeField(page)).toHaveValue('')
  })

  test('a region code with no country is kept on the page', async ({
    page
  }) => {
    await chooseYesForRegionCode(page)
    await regionCodeField(page).fill('75')
    await page
      .getByLabel(copy.internalReference.label)
      .fill('A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1))
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(regionCodeField(page)).toHaveValue('75')
  })

  test('a region code is saved once a country gives it its prefix', async ({
    page
  }) => {
    const originUrl = page.url()
    await chooseYesForRegionCode(page)
    await regionCodeField(page).fill('75')
    await page.getByLabel(copy.internalReference.label).fill(INTERNAL_REFERENCE)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page).toHaveURL(hubUrlOf(originUrl))

    await page.goto(originUrl)
    await expect(regionCodeField(page)).toHaveValue('')

    await answerOriginDetails(page, { regionCode: '75' })
    await expect(page).toHaveURL(hubUrlOf(originUrl))

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_PAGE))
    await expect(regionCodeOnReview(page)).toContainText('FR-75')
  })

  test('shows the saved country code as the prefix beside the region code box when the page is shown again', async ({
    page
  }) => {
    await reopenOriginAfterSaving(page)

    await expectRegionCodePrefix(page, france.code)
    await expect(regionCodeField(page)).toHaveValue('75')
  })

  test('choosing another country on a page shown again changes the prefix without leaving the page', async ({
    page
  }) => {
    const originUrl = await reopenOriginAfterSaving(page)

    await chooseCountryOfOrigin(page, netherlands.name)

    await expect(regionCodePrefix(page)).toHaveText(netherlands.code)
    await expect(page).toHaveURL(originUrl)
  })

  test('the prefix follows the country the user chose', async ({ page }) => {
    await reopenOriginAfterSaving(page, { countryName: ireland.name })

    await expectRegionCodePrefix(page, ireland.code)
  })

  test('before a country is chosen the revealed region code box has an empty prefix hidden from screen readers', async ({
    page
  }) => {
    await chooseYesForRegionCode(page)

    await expectRegionCodePrefix(page, '')
    await expect(regionCodePrefix(page)).toHaveAttribute('aria-hidden', 'true')
  })

  test('the region code box is named by its label and described by its hint', async ({
    page
  }) => {
    await chooseYesForRegionCode(page)

    await expect(regionCodeField(page)).toHaveAccessibleName(
      copy.regionCode.label
    )
    await expect(regionCodeField(page)).toHaveAccessibleDescription(
      copy.regionCode.hint
    )
  })

  test('choosing a country fills the prefix with its code as soon as it is picked, without leaving the page', async ({
    page
  }) => {
    const originUrl = page.url()
    await chooseYesForRegionCode(page)

    await chooseCountryOfOrigin(page, france.name)
    await expect(regionCodePrefix(page)).toHaveText(france.code)

    await chooseCountryOfOrigin(page, netherlands.name)
    await expect(regionCodePrefix(page)).toHaveText(netherlands.code)
    await expect(page).toHaveURL(originUrl)
  })

  test("choosing a subdivision fills the prefix with its parent country's code", async ({
    page
  }) => {
    await chooseYesForRegionCode(page)

    await chooseCountryOfOrigin(page, CANARY_ISLANDS_LABEL)

    await expect(regionCodePrefix(page)).toHaveText('ES')
  })

  test('clearing the country empties the prefix', async ({ page }) => {
    await chooseYesForRegionCode(page)
    await chooseCountryOfOrigin(page, france.name)
    await expect(regionCodePrefix(page)).toHaveText(france.code)

    await page.locator(countryInput).fill('')
    await page.locator(countryInput).blur()

    await expect(regionCodePrefix(page)).toHaveText('')
  })

  test('a refused page shows the submitted country code as the prefix', async ({
    page
  }) => {
    await submitRefusedOriginWithFrance(page)

    await expectRegionCodePrefix(page, france.code)
  })

  test('choosing another country on a refused page changes the prefix', async ({
    page
  }) => {
    await submitRefusedOriginWithFrance(page)

    await chooseCountryOfOrigin(page, netherlands.name)
    await expect(regionCodePrefix(page)).toHaveText(netherlands.code)
  })

  test('a submitted country value carrying markup is shown upper-cased as text, not as elements, in the prefix', async ({
    page
  }) => {
    const markup = '<b>x</b>'
    await chooseOutOfListCountry(page, markup)
    await chooseYesForRegionCode(page)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expect(regionCodePrefix(page)).toHaveText(markup.toUpperCase())
  })

  test('region code prefix has no serious or critical axe violations', async ({
    page
  }) => {
    await reopenOriginAfterSaving(page)

    await expectNoSeriousOrCriticalViolations(page, 'Origin with prefix')
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
      countryAndSubdivisionEntriesNamedWithCountry().length
    )
  })

  test('filters the list as the user types, case-insensitively', async ({
    page
  }) => {
    const field = page.locator(countryInput)

    await field.fill('IRELAND')
    await expect(
      page.getByRole('option', { name: ireland.name, exact: true })
    ).toBeVisible()
  })

  test('offers France and each French territory followed by (France) when the user types fra', async ({
    page
  }) => {
    const frenchTerritories = countryAndSubdivisionEntriesNamedWithCountry()
      .filter(({ code }) => code.startsWith(`${france.code}-`))
      .map(({ name }) => name)

    await page.locator(countryInput).fill('fra')
    await expect(
      page.getByRole('option', { name: france.name, exact: true })
    ).toBeVisible()

    expect(await page.getByRole('option').allTextContents()).toEqual(
      [france.name, ...frenchTerritories].sort((left, right) =>
        left.localeCompare(right)
      )
    )
  })

  test("a chosen territory is saved by its code and shown back named with its country and with its country's code as the prefix", async ({
    page
  }) => {
    const originUrl = page.url()
    const canaryIslands = countryAndSubdivisionEntriesNamedWithCountry().find(
      ({ code }) => code === 'ES-CN'
    )

    await chooseCountryOfOrigin(page, canaryIslands.name)
    await chooseYesForRegionCode(page)
    await regionCodeField(page).fill('12')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)
    await expect(page.locator(countryInput)).toHaveValue(CANARY_ISLANDS_LABEL)
    await expect(page.locator(countryHidden)).toHaveValue(canaryIslands.code)
    await expectRegionCodePrefix(page, 'ES')
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

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('native select submits and persists the country code', async ({
    page
  }) => {
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

  test('native select names each territory with its country', async ({
    page
  }) => {
    await expect(
      countryField(page).locator('option[value="ES-CN"]')
    ).toHaveText(CANARY_ISLANDS_LABEL)
  })

  test('the region code box shows with its label and hint and no prefix on first view', async ({
    page
  }) => {
    await expect(regionCodeField(page)).toBeVisible()
    await expect(regionCodeField(page)).toHaveAccessibleName(
      copy.regionCode.label
    )
    await expect(regionCodeField(page)).toHaveAccessibleDescription(
      copy.regionCode.hint
    )
    await expectNoRegionCodePrefix(page)
  })

  test('a saved region code is shown again with no prefix', async ({
    page
  }) => {
    const originUrl = page.url()
    await answerOriginDetails(page, { regionCode: '75' })
    await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

    await page.goto(originUrl)

    await expect(regionCodeField(page)).toHaveValue('75')
    await expectNoRegionCodePrefix(page)
  })

  test('a refused page shows the region code error with no prefix', async ({
    page
  }) => {
    await answerOriginDetails(page, { regionCode: '' })

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: copy.errors.regionCodeRequired })
    ).toBeVisible()
    await expect(page.locator('#regionOfOriginCodeSuffix-error')).toContainText(
      copy.errors.regionCodeRequired
    )
    await expectNoRegionCodePrefix(page)
  })

  for (const typedRegionCode of ['75', 'FR-75']) {
    test(`a region code typed as ${typedRegionCode} is saved as the joined code FR-75`, async ({
      page
    }) => {
      await answerOriginDetails(page, { regionCode: typedRegionCode })
      await expect(page).toHaveURL(urlUnderBase(COMMODITIES_PATH_PATTERN))

      await page.goto(journeyUrl(page, NOTIFICATION_VIEW_PAGE))

      await expect(regionCodeOnReview(page)).toContainText('FR-75')
    })
  }
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
    await chooseYesForRegionCode(page)
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(originUrl)
    const regionCodeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.regionCodeRequired })
    await expect(regionCodeError).toBeVisible()
    await regionCodeError.click()
    await expect(regionCodeField(page)).toBeFocused()
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
    await chooseYesForRegionCode(page)
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
    await chooseYesForRegionCode(page)
    await removeRegionCodeCap(page)
    await regionCodeField(page).fill('ABCDEF')
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const regionCodeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.regionCodeMaxLength })
    await expect(regionCodeError).toBeVisible()
    await regionCodeError.click()
    await expect(regionCodeField(page)).toBeFocused()
    await expect(regionCodeField(page)).toHaveValue('ABCDEF')
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
