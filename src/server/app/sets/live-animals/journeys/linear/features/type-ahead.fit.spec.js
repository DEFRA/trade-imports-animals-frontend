import { expect, test } from '@playwright/test'

import {
  FORM_GROUP_ANCESTOR_XPATH,
  PHONE_VIEWPORT,
  chooseOutOfListCountry,
  expectNoSeriousOrCriticalViolations,
  openArrival,
  openTransit,
  saveAndContinue,
  signIn,
  startNotificationAtImportReason,
  startNotificationAtOrigin
} from '../../../../../../../../fit/live-animals-journey.js'
import {
  countriesOrigin,
  portsOfEntry
} from '../../../../../services/_capture/fixtures.js'
import { copy as importReasonCopy } from './import-reason/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'
import { copy as transportCopy } from './transport/copy/copy.en.js'

const AUTOCOMPLETE_BUTTON = '.app-autocomplete__button'
const AUTOCOMPLETE_CONTAINER =
  'xpath=ancestor::*[contains(@class,"app-autocomplete")][1]'
const france = countriesOrigin.find(({ code }) => code === 'FR')
const ireland = countriesOrigin.find(({ code }) => code === 'IE')
const dover = portsOfEntry.find(({ code }) => code === 'GB DVR')
const DOVER_OPTION = `${dover.name} - ${dover.code}`

const inputFor = (page, inputId) => page.locator(`input#${inputId}`)

const openReveal = (reason) => async (page) => {
  await startNotificationAtImportReason(page)
  await page.locator(`input[name="reasonForImport"][value="${reason}"]`).check()
}

const countryCase = (fields) => ({
  typed: 'fra',
  suggestion: france.name,
  bold: 'Fra',
  labelSize: 'small',
  ...fields
})

const portCase = (fields) => ({
  typed: 'dov',
  suggestion: DOVER_OPTION,
  bold: 'Dov',
  labelSize: 'small',
  ...fields
})

const typeAheads = [
  countryCase({
    name: 'Country of origin',
    inputId: 'countryOfOrigin',
    label: originCopy.country.label,
    labelSize: 'medium',
    selectText: originCopy.country.selectText,
    searchPlaceholder: originCopy.country.searchPlaceholder,
    open: startNotificationAtOrigin
  }),
  portCase({
    name: 'Port of entry',
    inputId: 'portOfEntry',
    label: transportCopy.portOfEntry.port.label,
    hint: transportCopy.portOfEntry.port.hint,
    labelSize: 'medium',
    selectText: transportCopy.portOfEntry.port.selectText,
    searchPlaceholder: transportCopy.portOfEntry.port.searchPlaceholder,
    open: openArrival
  }),
  countryCase({
    name: 'Transit countries',
    inputId: 'transitedCountry',
    label: transportCopy.transitCountries.country.label,
    hint: transportCopy.transitCountries.country.hint,
    labelSize: 'medium',
    selectText: transportCopy.transitCountries.country.selectText,
    searchPlaceholder: transportCopy.transitCountries.country.searchPlaceholder,
    open: openTransit
  })
]

const revealedTypeAheads = [
  countryCase({
    name: 'Main import reason transhipment destination',
    inputId: 'transhipmentDestinationCountry',
    label: importReasonCopy.country.label,
    selectText: importReasonCopy.country.selectText,
    searchPlaceholder: importReasonCopy.country.searchPlaceholder,
    open: openReveal('transhipmentOrOnwardTravel')
  }),
  portCase({
    name: 'Main import reason transit port of exit',
    inputId: 'transitPortOfExit',
    label: importReasonCopy.port.label,
    selectText: importReasonCopy.port.selectText,
    searchPlaceholder: importReasonCopy.port.searchPlaceholder,
    open: openReveal('transit')
  }),
  countryCase({
    name: 'Main import reason transit destination',
    inputId: 'transitDestinationCountry',
    label: importReasonCopy.country.label,
    selectText: importReasonCopy.country.selectText,
    searchPlaceholder: importReasonCopy.country.searchPlaceholder,
    open: openReveal('transit')
  }),
  portCase({
    name: 'Main import reason temporary admission port of exit',
    inputId: 'temporaryAdmissionPortOfExit',
    label: importReasonCopy.port.label,
    selectText: importReasonCopy.port.selectText,
    searchPlaceholder: importReasonCopy.port.searchPlaceholder,
    open: openReveal('temporaryAdmissionHorses')
  })
]

const expectSquareButtonFlushWithBox = async (input) => {
  await expect(
    input
      .locator(AUTOCOMPLETE_CONTAINER)
      .locator('.autocomplete__dropdown-arrow-down')
  ).toHaveCSS('display', 'none')

  const measurements = await measureJoinedSearchButton(input)
  expect(measurements.buttonWidth).toBe(measurements.buttonHeight)
  expect(measurements.buttonTop).toBe(measurements.inputTop)
  expect(measurements.buttonBottom).toBe(measurements.inputBottom)
  expect(measurements.buttonRight).toBe(measurements.inputRight)
}

const showSuggestionFor = async (page, { inputId, typed, suggestion }) => {
  await inputFor(page, inputId).fill(typed)
  await expect(
    page.getByRole('option', { name: suggestion, exact: true })
  ).toBeVisible()
}

for (const typeAhead of [...typeAheads, ...revealedTypeAheads]) {
  const {
    name,
    inputId,
    label,
    hint,
    labelSize,
    typed,
    suggestion,
    bold,
    selectText,
    searchPlaceholder,
    open
  } = typeAhead

  test.describe(`${name} type-ahead`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await open(page)
    })

    test('shows the search placeholder and no value', async ({ page }) => {
      const input = inputFor(page, inputId)

      await expect(input).toHaveAttribute('placeholder', searchPlaceholder)
      await expect(input).toHaveAccessibleName(label)
      await expect(input).toHaveValue('')
    })

    test('shows a square button joined flush to the box and no dropdown arrow', async ({
      page
    }) => {
      await expectSquareButtonFlushWithBox(inputFor(page, inputId))
    })

    test('keeps the button out of assistive technology and the tab order, and focuses the box when it is clicked', async ({
      page
    }) => {
      const input = inputFor(page, inputId)
      const button = input
        .locator(AUTOCOMPLETE_CONTAINER)
        .locator(AUTOCOMPLETE_BUTTON)
      const urlBeforeClick = page.url()

      await expect(button).toHaveAttribute('aria-hidden', 'true')
      await expect(button).not.toHaveAttribute('tabindex')
      await expect(button).toHaveJSProperty('tagName', 'SPAN')

      await input.focus()
      await page.keyboard.press('Tab')
      await expect(input).not.toBeFocused()
      await expect(button).not.toBeFocused()

      await button.click()
      await expect(input).toBeFocused()
      await expect(page).toHaveURL(urlBeforeClick)
    })

    test(`shows ${bold} in bold in the ${suggestion} suggestion after typing ${typed}`, async ({
      page
    }) => {
      await showSuggestionFor(page, typeAhead)

      await expect.poll(() => boldLettersOf(page, suggestion)).toEqual([bold])
    })

    test('has no serious or critical axe violations with the button showing', async ({
      page
    }) => {
      await expectNoSeriousOrCriticalViolations(page, name)
    })

    test('has no serious or critical axe violations with a suggestion list open', async ({
      page
    }) => {
      await showSuggestionFor(page, typeAhead)

      await expectNoSeriousOrCriticalViolations(page, `${name} suggestions`)
    })
  })

  test.describe(`${name} type-ahead without JavaScript`, () => {
    test.use({ javaScriptEnabled: false })

    test(`is a native select named by its ${labelSize} label and described only by its hint, whose first option is the page select text and is selected, with no button`, async ({
      page
    }) => {
      const labelSizeModifier = {
        small: 'govuk-label--s',
        medium: 'govuk-label--m'
      }[labelSize]
      await signIn(page)
      await open(page)

      const formGroup = page
        .locator(`select#${inputId}`)
        .locator(FORM_GROUP_ANCESTOR_XPATH)
      const select = formGroup.getByLabel(label, { exact: true })

      await expect(select).toHaveJSProperty('tagName', 'SELECT')
      await expect(select).toBeVisible()
      await expect(select).toHaveValue('')
      await expect(select.locator('option').first()).toHaveText(selectText)
      await expect(select.locator('option').first()).toHaveJSProperty(
        'value',
        ''
      )
      await expect(select).toHaveAccessibleName(label)
      await expect(select).toHaveAccessibleDescription(hint ?? '')
      await expect(formGroup.locator(`label[for="${inputId}"]`)).toHaveClass(
        new RegExp(`\\b${labelSizeModifier}\\b`)
      )
      await expect(formGroup.getByRole('button')).toHaveCount(0)
      await expect(
        page.locator('.autocomplete__wrapper, .app-autocomplete__button')
      ).toHaveCount(0)
    })
  })
}

for (const typeAhead of revealedTypeAheads) {
  const { name, inputId } = typeAhead

  test.describe(`${name} type-ahead at phone width`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await page.setViewportSize(PHONE_VIEWPORT)
      await typeAhead.open(page)
    })

    test('keeps the button joined to the box and the suggestion list as wide as the joined control', async ({
      page
    }) => {
      await expectSquareButtonFlushWithBox(inputFor(page, inputId))

      await showSuggestionFor(page, typeAhead)
      const widths = await suggestionListWidthsOf(inputFor(page, inputId))

      expect(widths.listWidth).toBe(widths.controlWidth)
    })
  })
}

test.describe('country of origin change announcement', () => {
  const COUNTRY_SELECT = 'select#countryOfOrigin-select'

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
    await page.locator(COUNTRY_SELECT).evaluate((select) => {
      window.changeCount = 0
      select.addEventListener('change', () => {
        window.changeCount += 1
      })
    })
  })

  const changeCount = (page) => page.evaluate(() => window.changeCount)

  test('announces one change when a suggestion is clicked', async ({
    page
  }) => {
    await inputFor(page, 'countryOfOrigin').fill(france.name)
    await page.getByRole('option', { name: france.name, exact: true }).click()

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(france.code)
  })

  test('announces one change when a suggestion is chosen with Enter', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    const suggestion = page.getByRole('option', {
      name: ireland.name,
      exact: true
    })
    await input.fill(ireland.name)
    await expect(suggestion).toBeVisible()
    await input.press('ArrowDown')
    await expect(suggestion).toBeFocused()
    await suggestion.press('Enter')

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(ireland.code)
  })

  test('announces one change when the box is left on an exact match', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    await input.fill(france.name)
    await input.blur()

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(france.code)
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
    const input = inputFor(page, 'countryOfOrigin')
    await input.fill('Fr')
    const option = page.getByRole('option', { name: france.name, exact: true })
    await expect(option).toBeVisible()

    const govukInputFont = await govukInputStyleOf(page, {
      properties: ['font-family', 'font-size']
    })
    await expect(input).toHaveCSS('font-family', /^"?GDS Transport/)
    for (const element of [input, option]) {
      await expectStyle(element, govukInputFont)
    }
  })

  test('gives the enhanced input the GOV.UK input focus outline and inset shadow', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    const focusColour = await govukColourOf(page, 'focus')
    const { 'outline-width': govukOutlineWidth, 'box-shadow': govukShadow } =
      await govukInputStyleOf(page, {
        properties: ['outline-width', 'box-shadow'],
        focused: true
      })

    await input.focus()
    const inputColour = await input.evaluate(
      (element) => window.getComputedStyle(element).color
    )

    await expect(input).toHaveCSS('outline-color', focusColour)
    await expect(input).toHaveCSS('outline-width', govukOutlineWidth)
    await expect(input).toHaveCSS(
      'box-shadow',
      shadowInColour(govukShadow, inputColour)
    )
  })

  test('gives the enhanced input the standard GOV.UK error border', async ({
    page
  }) => {
    await chooseOutOfListCountry(page)
    await page
      .getByRole('radio', { name: originCopy.regionRequirement.no })
      .check()
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: originCopy.errors.countryFromList
      })
    ).toBeVisible()

    const errorColour = await govukColourOf(page, 'error')
    const input = inputFor(page, 'countryOfOrigin')
    await expect(input).toHaveCSS('border-top-color', errorColour)
    await expectStyle(
      input,
      await govukInputStyleOf(page, {
        classes: 'govuk-input govuk-input--error',
        properties: ['border-top-width']
      })
    )
    await expect(page.locator('#countryOfOrigin-error')).toHaveCSS(
      'color',
      errorColour
    )
  })
})

const govukColourOf = (page, token) =>
  page.evaluate((name) => {
    const reference = document.createElement('span')
    reference.style.color = `var(--govuk-${name}-colour)`
    document.body.append(reference)
    const { color } = window.getComputedStyle(reference)
    reference.remove()
    return color
  }, token)

const readInputStyleInBrowser = ({ classes, properties, focused }) => {
  const reference = document.createElement('input')
  reference.className = classes
  document.body.append(reference)
  if (focused) {
    reference.focus()
  }
  const style = window.getComputedStyle(reference)
  const values = Object.fromEntries(
    properties.map((name) => [name, style.getPropertyValue(name)])
  )
  reference.remove()
  return values
}

const govukInputStyleOf = (
  page,
  { classes = 'govuk-input', properties, focused = false }
) => page.evaluate(readInputStyleInBrowser, { classes, properties, focused })

const expectStyle = async (locator, style) => {
  for (const [property, value] of Object.entries(style)) {
    await expect(locator).toHaveCSS(property, value)
  }
}

const shadowInColour = (shadow, colour) =>
  shadow.replace(/^rgba?\([^)]*\)/, colour)

const measureJoinedSearchButton = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    const button = container.querySelector('.app-autocomplete__button')
    const inputEdges = inputElement.getBoundingClientRect()
    const buttonEdges = button.getBoundingClientRect()
    return {
      inputTop: inputEdges.top,
      inputBottom: inputEdges.bottom,
      inputRight: inputEdges.right,
      buttonTop: buttonEdges.top,
      buttonBottom: buttonEdges.bottom,
      buttonRight: buttonEdges.right,
      buttonWidth: buttonEdges.width,
      buttonHeight: buttonEdges.height
    }
  })

const suggestionListWidthsOf = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    return {
      listWidth: container
        .querySelector('.autocomplete__menu')
        .getBoundingClientRect().width,
      controlWidth: container.getBoundingClientRect().width
    }
  })

const boldLettersOf = (page, suggestionName) =>
  page
    .getByRole('option', { name: suggestionName, exact: true })
    .locator('strong')
    .allTextContents()
