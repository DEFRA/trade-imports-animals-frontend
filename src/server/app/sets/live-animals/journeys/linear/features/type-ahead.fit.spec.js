import { expect, test } from '@playwright/test'

import {
  FORM_GROUP_ANCESTOR_XPATH,
  GOVUK_BLUE,
  GOVUK_BLUE_SHADE_50,
  WHITE,
  childTagsAndClassesOf,
  expectNoSeriousOrCriticalViolations,
  expectedFormGroupChildren,
  openArrival,
  openTransit,
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

const PHONE_VIEWPORT = { width: 375, height: 800 }
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
  labelSize: 's',
  ...fields
})

const portCase = (fields) => ({
  typed: 'dov',
  suggestion: DOVER_OPTION,
  bold: 'Dov',
  labelSize: 's',
  ...fields
})

const typeAheads = [
  countryCase({
    name: 'Country of origin',
    inputId: 'countryOfOrigin',
    label: originCopy.country.label,
    labelSize: 'm',
    selectText: originCopy.country.selectText,
    emptyBoxText: originCopy.country.searchPlaceholder,
    open: startNotificationAtOrigin
  }),
  portCase({
    name: 'Port of entry',
    inputId: 'portOfEntry',
    label: transportCopy.portOfEntry.port.label,
    hint: transportCopy.portOfEntry.port.hint,
    labelSize: 'm',
    selectText: transportCopy.portOfEntry.port.placeholder,
    emptyBoxText: transportCopy.portOfEntry.port.placeholder,
    open: openArrival
  }),
  countryCase({
    name: 'Transit countries',
    inputId: 'transitedCountry',
    label: transportCopy.transitCountries.country.label,
    hint: transportCopy.transitCountries.country.hint,
    selectText: transportCopy.transitCountries.country.placeholder,
    open: openTransit
  })
]

const revealedTypeAheads = [
  countryCase({
    name: 'Main import reason transhipment destination',
    inputId: 'transhipmentDestinationCountry',
    label: importReasonCopy.country.label,
    selectText: importReasonCopy.country.placeholder,
    emptyBoxText: importReasonCopy.country.placeholder,
    open: openReveal('transhipmentOrOnwardTravel')
  }),
  portCase({
    name: 'Main import reason transit port of exit',
    inputId: 'transitPortOfExit',
    label: importReasonCopy.port.label,
    selectText: importReasonCopy.port.placeholder,
    emptyBoxText: importReasonCopy.port.placeholder,
    open: openReveal('transit')
  }),
  countryCase({
    name: 'Main import reason transit destination',
    inputId: 'transitDestinationCountry',
    label: importReasonCopy.country.label,
    selectText: importReasonCopy.country.placeholder,
    emptyBoxText: importReasonCopy.country.placeholder,
    open: openReveal('transit')
  }),
  portCase({
    name: 'Main import reason temporary admission port of exit',
    inputId: 'temporaryAdmissionPortOfExit',
    label: importReasonCopy.port.label,
    selectText: importReasonCopy.port.placeholder,
    emptyBoxText: importReasonCopy.port.placeholder,
    open: openReveal('temporaryAdmissionHorses')
  })
]

const expectJoinedBlueButton = (measurements) => {
  expect(measurements.arrowDisplay).toBe('none')
  expect(measurements.background).toBe(GOVUK_BLUE)
  expect(measurements.iconColour).toBe(WHITE)
  expect(measurements.boxShadow).toContain(GOVUK_BLUE_SHADE_50)
  expect(measurements.borderWidth).toBe('0px')
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
    emptyBoxText,
    open
  } = typeAhead

  test.describe(`${name} type-ahead`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await open(page)
    })

    if (emptyBoxText !== undefined) {
      test('shows the empty search box text and no value', async ({ page }) => {
        const input = inputFor(page, inputId)

        await expect(input).toHaveAttribute('placeholder', emptyBoxText)
        await expect(input).toHaveValue('')
      })
    }

    test('shows the joined blue magnifying glass button flush with the box and no dropdown arrow', async ({
      page
    }) => {
      expectJoinedBlueButton(
        await measureJoinedSearchButton(inputFor(page, inputId))
      )
    })

    test('keeps the button out of assistive technology and the tab order, and focuses the box when it is clicked', async ({
      page
    }) => {
      const input = inputFor(page, inputId)
      const button = input
        .locator(AUTOCOMPLETE_CONTAINER)
        .locator('.app-autocomplete__button')
      const urlBeforeClick = page.url()

      await expect(button).toHaveAttribute('aria-hidden', 'true')
      await expect(button).not.toHaveAttribute('tabindex')
      expect(await button.evaluate((element) => element.tagName)).toBe('SPAN')

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

    test('is a native select found by its label, whose first option is the page select text and is selected, with no button', async ({
      page
    }) => {
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
      expect(await childTagsAndClassesOf(formGroup)).toEqual(
        expectedFormGroupChildren({ hint, labelSize })
      )
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
      expectJoinedBlueButton(
        await measureJoinedSearchButton(inputFor(page, inputId))
      )

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

const measureJoinedSearchButton = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    const button = container.querySelector('.app-autocomplete__button')
    const arrow = container.querySelector('.autocomplete__dropdown-arrow-down')
    const inputEdges = inputElement.getBoundingClientRect()
    const buttonEdges = button.getBoundingClientRect()
    const buttonStyle = window.getComputedStyle(button)
    return {
      arrowDisplay: window.getComputedStyle(arrow).display,
      inputTop: inputEdges.top,
      inputBottom: inputEdges.bottom,
      inputRight: inputEdges.right,
      buttonTop: buttonEdges.top,
      buttonBottom: buttonEdges.bottom,
      buttonRight: buttonEdges.right,
      buttonWidth: buttonEdges.width,
      buttonHeight: buttonEdges.height,
      background: buttonStyle.backgroundColor,
      boxShadow: buttonStyle.boxShadow,
      borderWidth: buttonStyle.borderTopWidth,
      iconColour: window.getComputedStyle(button, '::before').backgroundColor
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
