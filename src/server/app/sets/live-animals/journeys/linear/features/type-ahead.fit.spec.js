import { expect, test } from '@playwright/test'

import {
  PHONE_VIEWPORT,
  chooseOutOfListCountry,
  errorSummaryLinks,
  expectNoSeriousOrCriticalViolations,
  expectStyle,
  govukColourOf,
  measureReferenceElement,
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
import { ENGLISH_ASSISTIVE_HINT } from '../../../../../../../client/javascripts/components/autocomplete-text.js'
import { copy as importReasonCopy } from './import-reason/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'
import { copy as transportCopy } from './transport/copy/copy.en.js'

const AUTOCOMPLETE_CONTAINER =
  'xpath=ancestor::*[contains(@class,"app-autocomplete")][1]'
const SEARCH_BUTTON = '.app-autocomplete__button'
const france = countriesOrigin.find(({ code }) => code === 'FR')

const inputFor = (page, inputId) => page.locator(`input#${inputId}`)

const openReveal = (reason) => async (page) => {
  await startNotificationAtImportReason(page)
  await page.locator(`input[name="reasonForImport"][value="${reason}"]`).check()
}

const countryCase = (fields) => ({
  typed: 'fra',
  typedWithAccent: 'frâ',
  suggestion: france.name,
  bold: 'Fra',
  ...fields
})

const portCase = (fields) => {
  const dover = portsOfEntry.find(({ code }) => code === 'GB DVR')
  return {
    typed: 'dov',
    typedWithAccent: 'dóv',
    suggestion: `${dover.name} - ${dover.code}`,
    bold: 'Dov',
    ...fields
  }
}

const typeAheads = [
  countryCase({
    name: 'Country of origin',
    inputId: 'countryOfOrigin',
    label: originCopy.country.label,
    selectText: originCopy.country.selectText,
    searchPlaceholder: originCopy.country.searchPlaceholder,
    open: startNotificationAtOrigin
  }),
  portCase({
    name: 'Port of entry',
    inputId: 'portOfEntry',
    label: transportCopy.portOfEntry.port.label,
    hint: transportCopy.portOfEntry.port.hint,
    selectText: transportCopy.portOfEntry.port.selectText,
    searchPlaceholder: transportCopy.portOfEntry.port.searchPlaceholder,
    open: openArrival
  }),
  countryCase({
    name: 'Transit countries',
    inputId: 'transitedCountry',
    label: transportCopy.transitCountries.country.label,
    hint: transportCopy.transitCountries.country.hint,
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

const shadowInColour = (shadow, colour) =>
  `${colour} ${shadow.replace(/^rgba?\([^)]*\)\s*/, '')}`

const searchButtonOf = (input) =>
  input.locator(AUTOCOMPLETE_CONTAINER).locator(SEARCH_BUTTON)

const edgesOf = (locator) =>
  locator.evaluate((element) => {
    const { top, bottom, right, width, height } =
      element.getBoundingClientRect()
    return { top, bottom, right, width, height }
  })

const expectSquareButtonFlushWithBox = async (input) => {
  const inputEdges = await edgesOf(input)
  const buttonEdges = await edgesOf(searchButtonOf(input))

  expect(buttonEdges.width).toBe(buttonEdges.height)
  expect(buttonEdges.top).toBe(inputEdges.top)
  expect(buttonEdges.bottom).toBe(inputEdges.bottom)
  expect(buttonEdges.right).toBe(inputEdges.right)
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
    typed,
    typedWithAccent,
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

    test('shows a square button joined flush to the box', async ({ page }) => {
      await expectSquareButtonFlushWithBox(inputFor(page, inputId))
    })

    test('keeps the button out of assistive technology and the tab order, and focuses the box when it is clicked', async ({
      page
    }) => {
      const input = inputFor(page, inputId)
      const button = searchButtonOf(input)
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

    test(`offers the ${suggestion} suggestion with ${bold} in bold after typing ${typedWithAccent}, which differs from the name only by accents`, async ({
      page
    }) => {
      await showSuggestionFor(page, {
        inputId,
        typed: typedWithAccent,
        suggestion
      })

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

    test('is a native select named by its label and described only by its hint, whose first option is the page select text and is selected, and is the only control with its id', async ({
      page
    }) => {
      await signIn(page)
      await open(page)

      const select = page.locator(`#${inputId}`)

      await expect(select).toHaveCount(1)
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
    const ireland = countriesOrigin.find(({ code }) => code === 'IE')
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

test.describe('country of origin type-ahead announcements', () => {
  const iceland = countriesOrigin.find(({ name }) => name === 'Iceland')

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  const statusRegion = (page, text) =>
    page
      .locator('#countryOfOrigin__status--A, #countryOfOrigin__status--B')
      .filter({ hasText: new RegExp(`^${text}\\s*$`) })

  test('describes the search box by the assistive hint', async ({ page }) => {
    await expect(inputFor(page, 'countryOfOrigin')).toHaveAccessibleDescription(
      ENGLISH_ASSISTIVE_HINT
    )
  })

  test('announces how many results are available after typing', async ({
    page
  }) => {
    await inputFor(page, 'countryOfOrigin').fill(iceland.name)

    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(statusRegion(page, '1 result is available\\.')).toHaveCount(1)
  })

  test('announces the highlighted country with its place among the results', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    await input.fill(iceland.name)
    await expect(page.getByRole('option')).toHaveCount(1)

    await input.press('ArrowDown')

    await expect(
      statusRegion(
        page,
        `1 result is available\\. ${iceland.name} 1 of 1 is highlighted`
      )
    ).toHaveCount(1)
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

  test("gives the enhanced input the GOV.UK input focus outline, and GOV.UK's inset focus shadow in the input's own text colour", async ({
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

    await expect(input).toHaveCSS('outline-color', focusColour)
    await expect(input).toHaveCSS('outline-width', govukOutlineWidth)
    const inputColour = await input.evaluate(
      (element) => getComputedStyle(element).color
    )
    await expect(input).toHaveCSS(
      'box-shadow',
      shadowInColour(govukShadow, inputColour)
    )
  })

  test('gives the enhanced input the GOV.UK error border width and the same error colour as the inline error message', async ({
    page
  }) => {
    await chooseOutOfListCountry(page)
    await page
      .getByRole('radio', { name: originCopy.regionRequirement.no })
      .check()
    await saveAndContinue(page).click()
    await expect(
      errorSummaryLinks(page, originCopy.errors.countryFromList)
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

const govukInputStyleOf = (
  page,
  { classes = 'govuk-input', properties, focused = false }
) =>
  measureReferenceElement(page, {
    tagName: 'input',
    className: classes,
    focused,
    properties
  })

const suggestionListWidthsOf = async (input) => {
  const container = input.locator(AUTOCOMPLETE_CONTAINER)
  return {
    listWidth: (await edgesOf(container.getByRole('listbox'))).width,
    controlWidth: (await edgesOf(container)).width
  }
}

const boldLettersOf = (page, suggestionName) =>
  page
    .getByRole('option', { name: suggestionName, exact: true })
    .locator('strong')
    .allTextContents()
