import { expect, test } from '@playwright/test'

import {
  carryOpeningRunToImportReason,
  chooseTypeAheadOption,
  chooseTodayFromDatePicker,
  describeDatePickerLook,
  expectNoSeriousOrCriticalViolations,
  journeyUrl,
  visitOverviewThenOpen,
  openDatePicker,
  startNotificationAtImportReason,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import {
  countryAndSubdivisionEntriesNamedWithCountry,
  portsOfEntry
} from '../../../../../../services/_capture/fixtures.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import {
  copy as sharedCopy,
  validatorDefaults
} from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const HUB_PATH_PATTERN = '/notifications/[^/]+'
const REASON_INPUT_SELECTOR = 'input[name="reasonForImport"]'
const PURPOSE_INPUT_SELECTOR = 'input[name="purposeInInternalMarket"]'
const SUBMIT_BUTTON = 'form button[type="submit"]'
const CHOOSE_DATE_LABEL = 'Choose date'
const PORT_CODE = 'GB DVR'
const COUNTRY_CODE = 'IE'
const EXIT_PORT = portsOfEntry.find(({ code }) => code === PORT_CODE)
const EXIT_PORT_LABEL = `${EXIT_PORT.name} - ${EXIT_PORT.code}`
const UNIQUE_DOVER_TERMINAL_LABEL = `Dover - ${PORT_CODE}`
const IRELAND = countryAndSubdivisionEntriesNamedWithCountry().find(
  ({ code }) => code === COUNTRY_CODE
)
const CANARY_ISLANDS = countryAndSubdivisionEntriesNamedWithCountry().find(
  ({ code }) => code === 'ES-CN'
)
const transitPortInput = 'input#transitPortOfExit'
const transitPortHidden = 'select#transitPortOfExit-select'
const transitCountryInput = 'input#transitDestinationCountry'
const transitCountryHidden = 'select#transitDestinationCountry-select'
const transhipmentCountryInput = 'input#transhipmentDestinationCountry'
const transhipmentCountryHidden = 'select#transhipmentDestinationCountry-select'
const NO_JS_EXIT_DATE = '15/06/2030'
const SECOND_PORT = portsOfEntry.find(({ code }) => code !== PORT_CODE)
const SECOND_PORT_LABEL = `${SECOND_PORT.name} - ${SECOND_PORT.code}`
const FRANCE = countryAndSubdivisionEntriesNamedWithCountry().find(
  ({ code }) => code === 'FR'
)
const irelandMatches = countryAndSubdivisionEntriesNamedWithCountry().filter(
  ({ name }) => /ire/i.test(name)
)
const TEMPORARY_ADMISSION_DATE = '#temporaryAdmissionExitDate'
const EXIT_DATE_LABEL = 'label[for="temporaryAdmissionExitDate"]'
const REGULAR_FONT_WEIGHT = '400'
const ARIA_CONTROLS = 'aria-controls'
const temporaryAdmissionPortInput = 'input#temporaryAdmissionPortOfExit'
const temporaryAdmissionPortHidden =
  'select#temporaryAdmissionPortOfExit-select'

const expectExitDateLabelRegularWeight = async (page) => {
  await expect(page.locator(EXIT_DATE_LABEL)).toHaveText(copy.date.label)
  await expect(page.locator(EXIT_DATE_LABEL)).toHaveCSS(
    'font-weight',
    REGULAR_FONT_WEIGHT
  )
}

const radioFor = (page, value) =>
  page.locator(`${REASON_INPUT_SELECTOR}[value="${value}"]`)

const revealFor = async (page, value) => {
  await expect(
    radioFor(page, value),
    `${value} controls a reveal`
  ).toHaveAttribute(ARIA_CONTROLS, /.+/)
  const controls = await radioFor(page, value).getAttribute(ARIA_CONTROLS)
  return page.locator(`#${controls}`)
}

const fieldIdsIn = (reveal) =>
  reveal
    .locator('select, input:not([type="hidden"])')
    .evaluateAll((fields) =>
      fields
        .filter((field) => !field.id.endsWith('-select'))
        .map((field) => field.id)
    )

const TRANSIT_PORT = {
  label: copy.port.label,
  query: EXIT_PORT.code,
  optionName: EXIT_PORT_LABEL,
  inputId: 'transitPortOfExit'
}

const TRANSIT_COUNTRY = {
  label: copy.country.label,
  query: IRELAND.name,
  optionName: IRELAND.name,
  inputId: 'transitDestinationCountry'
}

const TEMPORARY_ADMISSION_PORT = {
  label: copy.port.label,
  query: EXIT_PORT.code,
  optionName: EXIT_PORT_LABEL,
  inputId: 'temporaryAdmissionPortOfExit'
}

const everyOptionIn = (select) =>
  select.locator('option').evaluateAll((options) =>
    options.map((option) => ({
      value: option.value,
      label: option.textContent
    }))
  )

const expectedExitPortOptions = () => [
  { value: '', label: copy.port.selectText },
  ...portsOfEntry.map((port) => ({
    value: port.code,
    label: `${port.name} - ${port.code}`
  }))
]

const expectedDestinationCountryOptions = () => [
  { value: '', label: copy.country.selectText },
  ...countryAndSubdivisionEntriesNamedWithCountry().map(({ code, name }) => ({
    value: code,
    label: name
  }))
]

const expectSelectOpensOnSelectText = async (select, expectedOptions) => {
  await expect(select).toHaveValue('')
  expect(await everyOptionIn(select)).toEqual(expectedOptions)
}

test.describe('import-reason feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
  })

  test('titles the browser tab and heads the page with its name alone, keeping the question as a legend only a screen reader meets', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${copy.title} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
    await expect(page.getByRole('main').getByRole('heading')).toHaveText([
      copy.title
    ])

    await expect(
      page.locator('legend').filter({ hasText: copy.legend })
    ).toHaveClass(/govuk-visually-hidden/)
    await expect(page.getByRole('group', { name: copy.legend })).toBeVisible()
  })

  test('renders the service-backed reasons and feature copy', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.legend })
    const renderedValues = await group
      .locator(REASON_INPUT_SELECTOR)
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(
      importReasonPurpose.reasons().map(({ value }) => value)
    )
    for (const option of importReasonPurpose.reasons()) {
      await expect(
        page.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
      await expect(group).toContainText(copy.reasonHints[option.value])
    }
  })

  test('reason validation: when the submitted option is invalid, links to and focuses the group without preserving an invalid selection', async ({
    page
  }) => {
    await page
      .locator(REASON_INPUT_SELECTOR)
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-reason'
        input.checked = true
      })
    await page.locator(SUBMIT_BUTTON).first().click()

    const reasonError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(reasonError).toBeVisible()
    await reasonError.click()
    await expect(page.locator(REASON_INPUT_SELECTOR).first()).toBeFocused()
    await expect(page.locator(`${REASON_INPUT_SELECTOR}:checked`)).toHaveCount(
      0
    )
  })

  test('saves a valid reason, redirects and persists the answer', async ({
    page
  }) => {
    const reasonUrl = page.url()
    const selected = importReasonPurpose
      .reasons()
      .find(({ value }) => value === 'internalMarket')
    const purpose = importReasonPurpose
      .purposes()
      .find(({ value }) => value === 'breeding')

    await page.getByRole('radio', { name: selected.text, exact: true }).check()
    await page.getByRole('radio', { name: purpose.text, exact: true }).check()
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(
      page.getByRole('radio', { name: selected.text, exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', { name: purpose.text, exact: true })
    ).toBeChecked()
  })

  test('back link returns to the overview when the page is opened from the overview', async ({
    page
  }) => {
    await carryOpeningRunToImportReason(page)
    await visitOverviewThenOpen(page, 'import-reason')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(journeyUrl(page))
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })
})

test.describe('import-reason reveals', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
  })

  test('opens no reveal until a reason that needs one is chosen', async ({
    page
  }) => {
    const transitReveal = await revealFor(page, 'transit')
    await expect(transitReveal).toBeHidden()

    await radioFor(page, 'reEntry').check()
    await expect(transitReveal).toBeHidden()
    await expect(radioFor(page, 'reEntry')).not.toHaveAttribute(ARIA_CONTROLS)
  })

  test('asks the internal-market purpose under its own radio', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    const reveal = await revealFor(page, 'internalMarket')

    await expect(reveal).toBeVisible()
    await expect(reveal.getByText(copy.purpose.legend)).toBeVisible()
    const renderedPurposes = await reveal
      .locator(PURPOSE_INPUT_SELECTOR)
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedPurposes).toEqual(
      importReasonPurpose.purposes().map(({ value }) => value)
    )
    for (const option of importReasonPurpose.purposes()) {
      await expect(
        reveal.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
      await expect(reveal).toContainText(copy.purpose.hints[option.value])
    }
  })

  test('asks transit for the port of exit and then the destination country', async ({
    page
  }) => {
    await radioFor(page, 'transit').check()
    const reveal = await revealFor(page, 'transit')

    await expect(reveal).toBeVisible()
    expect(await fieldIdsIn(reveal)).toEqual([
      'transitPortOfExit',
      'transitDestinationCountry'
    ])
    await expect(page.locator(transitPortHidden)).toBeAttached()
    await expect(page.locator(transitPortInput)).toHaveAccessibleName(
      copy.port.label
    )
    await expectSelectOpensOnSelectText(
      page.locator(transitPortHidden),
      expectedExitPortOptions()
    )
    await expect(page.locator(transitCountryHidden)).toBeAttached()
    await expect(page.locator(transitCountryInput)).toHaveAccessibleName(
      copy.country.label
    )
    await expectSelectOpensOnSelectText(
      page.locator(transitCountryHidden),
      expectedDestinationCountryOptions()
    )
  })

  test('asks temporary admission for the exit date and then the port of exit', async ({
    page
  }) => {
    await radioFor(page, 'temporaryAdmissionHorses').check()
    const reveal = await revealFor(page, 'temporaryAdmissionHorses')

    await expect(reveal).toBeVisible()
    await expect(
      reveal.getByRole('button', { name: CHOOSE_DATE_LABEL })
    ).toBeVisible()
    await expect(
      page.locator(TEMPORARY_ADMISSION_DATE)
    ).toHaveAccessibleDescription(copy.date.hint)
    await expect(page.locator(temporaryAdmissionPortHidden)).toBeAttached()
    await expect(
      page.locator(temporaryAdmissionPortInput)
    ).toHaveAccessibleName(copy.port.label)
    await expectSelectOpensOnSelectText(
      page.locator(temporaryAdmissionPortHidden),
      expectedExitPortOptions()
    )
    expect(await fieldIdsIn(reveal)).toEqual([
      'temporaryAdmissionExitDate',
      'temporaryAdmissionPortOfExit'
    ])
    await expectExitDateLabelRegularWeight(page)
  })

  test('asks transhipment for the destination country alone', async ({
    page
  }) => {
    await radioFor(page, 'transhipmentOrOnwardTravel').check()
    const reveal = await revealFor(page, 'transhipmentOrOnwardTravel')

    await expect(reveal).toBeVisible()
    expect(await fieldIdsIn(reveal)).toEqual(['transhipmentDestinationCountry'])
    await expect(page.locator(transhipmentCountryHidden)).toBeAttached()
    await expect(page.locator(transhipmentCountryInput)).toHaveAccessibleName(
      copy.country.label
    )
    await expectSelectOpensOnSelectText(
      page.locator(transhipmentCountryHidden),
      expectedDestinationCountryOptions()
    )
  })

  test('saves a reason and its reveal in one submit, and offers the answers back', async ({
    page
  }) => {
    const reasonUrl = page.url()

    await radioFor(page, 'transit').check()
    await chooseTypeAheadOption(page, TRANSIT_PORT)
    await chooseTypeAheadOption(page, TRANSIT_COUNTRY)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(radioFor(page, 'transit')).toBeChecked()
    await expect(page.locator(transitPortHidden)).toHaveValue(PORT_CODE)
    await expect(page.locator(transitPortInput)).toHaveValue(EXIT_PORT_LABEL)
    await expect(page.locator(transitCountryHidden)).toHaveValue(COUNTRY_CODE)
    await expect(page.locator(transitCountryInput)).toHaveValue(IRELAND.name)
  })

  test('refuses an unanswered reveal, links to the field and keeps the reveal open', async ({
    page
  }) => {
    await radioFor(page, 'transit').check()
    await chooseTypeAheadOption(page, TRANSIT_PORT)
    await page.locator(SUBMIT_BUTTON).first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.locator(transitCountryInput)).toBeFocused()
    await expect(page.locator(transitPortHidden)).toHaveValue(PORT_CODE)
  })

  test('refuses an unanswered internal-market purpose, links to the first radio and keeps the reveal open', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    await page.locator(SUBMIT_BUTTON).first().click()

    const purposeError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.purposeRequired })
    await expect(purposeError).toBeVisible()

    const reveal = await revealFor(page, 'internalMarket')
    await expect(reveal).toBeVisible()
    await expect(reveal).toContainText(copy.errors.purposeRequired)

    await purposeError.click()
    await expect(page.locator(PURPOSE_INPUT_SELECTOR).first()).toBeFocused()
    await expect(radioFor(page, 'internalMarket')).toBeChecked()
  })

  test('saves an exit date chosen from the picker inside the reveal, and offers it back', async ({
    page
  }) => {
    const reasonUrl = page.url()

    await radioFor(page, 'temporaryAdmissionHorses').check()
    const expected = await chooseTodayFromDatePicker(page, copy.date.label)
    await expect(page.locator(TEMPORARY_ADMISSION_DATE)).toHaveValue(expected)
    await chooseTypeAheadOption(page, TEMPORARY_ADMISSION_PORT)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(page.locator(TEMPORARY_ADMISSION_DATE)).toHaveValue(expected)
    await expect(page.locator(temporaryAdmissionPortHidden)).toHaveValue(
      PORT_CODE
    )
    await expect(page.locator(temporaryAdmissionPortInput)).toHaveValue(
      EXIT_PORT_LABEL
    )
  })

  test('refuses a blank exit date, links to the picker input and keeps the port the user did choose', async ({
    page
  }) => {
    await radioFor(page, 'temporaryAdmissionHorses').check()
    await chooseTypeAheadOption(page, TEMPORARY_ADMISSION_PORT)
    await page.locator(SUBMIT_BUTTON).first().click()

    const dateError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.dateRequired })
    await expect(dateError).toBeVisible()

    const reveal = await revealFor(page, 'temporaryAdmissionHorses')
    await expect(reveal).toContainText(copy.errors.dateRequired)

    await dateError.click()
    await expect(page.locator(TEMPORARY_ADMISSION_DATE)).toBeFocused()
    await expect(page.locator(temporaryAdmissionPortHidden)).toHaveValue(
      PORT_CODE
    )
  })
})

test.describe('import-reason exit date calendar', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
    await radioFor(page, 'temporaryAdmissionHorses').check()
  })

  describeDatePickerLook({
    fieldName: 'exit date',
    label: copy.date.label,
    nextQuestionLabel: (page) =>
      page.locator('label[for="temporaryAdmissionPortOfExit"]')
  })
})

test.describe('import-reason destination territories', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
  })

  test('saves a territory as the destination country and offers it back', async ({
    page
  }) => {
    const reasonUrl = page.url()

    await radioFor(page, 'transhipmentOrOnwardTravel').check()
    await chooseTypeAheadOption(page, {
      label: copy.country.label,
      optionName: CANARY_ISLANDS.name,
      inputId: 'transhipmentDestinationCountry'
    })
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(page.locator(transhipmentCountryHidden)).toHaveValue('ES-CN')
    await expect(page.locator(transhipmentCountryInput)).toHaveValue(
      CANARY_ISLANDS.name
    )
  })
})

test.describe('import-reason port and country type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
    await radioFor(page, 'transit').check()
  })

  test('offers the whole port list on focus, without typing', async ({
    page
  }) => {
    await page.locator(transitPortInput).click()
    await expect(
      page.getByRole('option', { name: EXIT_PORT_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(portsOfEntry.length)
  })

  test('filters ports as the user types', async ({ page }) => {
    const field = page.locator(transitPortInput)
    await field.fill(UNIQUE_DOVER_TERMINAL_LABEL)
    await expect(
      page.getByRole('option', { name: EXIT_PORT_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(1)
  })

  test('tells the user when no ports match what they typed', async ({
    page
  }) => {
    await page.locator(transitPortInput).fill('zzzzzz')
    await expect(page.getByText(copy.port.noResults)).toBeVisible()
  })

  test('offers the whole country list on focus, without typing', async ({
    page
  }) => {
    await page.locator(transitCountryInput).click()
    await expect(
      page.getByRole('option', { name: IRELAND.name, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(
      countryAndSubdivisionEntriesNamedWithCountry().length
    )
  })

  test('filters countries as the user types', async ({ page }) => {
    const field = page.locator(transitCountryInput)
    await field.fill('ire')
    await expect(
      page.getByRole('option', { name: IRELAND.name, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(irelandMatches.length)
  })

  test('tells the user when no countries match what they typed', async ({
    page
  }) => {
    await page.locator(transitCountryInput).fill('zzzzzz')
    await expect(page.getByText(copy.country.noResults)).toBeVisible()
  })

  test('lets the user change the port and country they picked', async ({
    page
  }) => {
    await chooseTypeAheadOption(page, TRANSIT_PORT)
    await expect(page.locator(transitPortHidden)).toHaveValue(PORT_CODE)

    await chooseTypeAheadOption(page, {
      ...TRANSIT_PORT,
      query: SECOND_PORT.code,
      optionName: SECOND_PORT_LABEL
    })
    await expect(page.locator(transitPortHidden)).toHaveValue(SECOND_PORT.code)
    await expect(page.locator(transitPortInput)).toHaveValue(SECOND_PORT_LABEL)

    await chooseTypeAheadOption(page, TRANSIT_COUNTRY)
    await expect(page.locator(transitCountryHidden)).toHaveValue(COUNTRY_CODE)

    await chooseTypeAheadOption(page, {
      ...TRANSIT_COUNTRY,
      query: FRANCE.name,
      optionName: FRANCE.name
    })
    await expect(page.locator(transitCountryHidden)).toHaveValue(FRANCE.code)
    await expect(page.locator(transitCountryInput)).toHaveValue(FRANCE.name)
  })

  test('offers options again after the user replaces a no-match search term', async ({
    page
  }) => {
    const portField = page.locator(transitPortInput)
    await portField.fill('zzzzzz')
    await expect(page.getByText(copy.port.noResults)).toBeVisible()
    await portField.fill(PORT_CODE)
    await expect(
      page.getByRole('option', { name: EXIT_PORT_LABEL, exact: true })
    ).toBeVisible()
  })
})

test.describe('import-reason temporary admission port type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
    await radioFor(page, 'temporaryAdmissionHorses').check()
  })

  test('offers the whole port list on focus, without typing', async ({
    page
  }) => {
    await page.locator(temporaryAdmissionPortInput).click()
    await expect(
      page.getByRole('option', { name: EXIT_PORT_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(portsOfEntry.length)
  })

  test('tells the user when no ports match what they typed', async ({
    page
  }) => {
    await page.locator(temporaryAdmissionPortInput).fill('zzzzzz')
    await expect(page.getByText(copy.port.noResults)).toBeVisible()
  })
})

test.describe('import-reason port and country without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows the exit date label in regular weight under temporary admission', async ({
    page
  }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)

    await radioFor(page, 'temporaryAdmissionHorses').check()

    await expectExitDateLabelRegularWeight(page)
  })

  test('native selects submit and persist port and country codes', async ({
    page
  }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
    const reasonUrl = page.url()

    await radioFor(page, 'transit').check()
    await page.locator('select#transitPortOfExit').selectOption(PORT_CODE)
    await page
      .locator('select#transitDestinationCountry')
      .selectOption(COUNTRY_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(page.locator('select#transitPortOfExit')).toHaveValue(
      PORT_CODE
    )
    await expect(page.locator('select#transitDestinationCountry')).toHaveValue(
      COUNTRY_CODE
    )

    await page.goto(reasonUrl)
    await radioFor(page, 'temporaryAdmissionHorses').check()
    await page.locator(TEMPORARY_ADMISSION_DATE).fill(NO_JS_EXIT_DATE)
    await page
      .locator('select#temporaryAdmissionPortOfExit')
      .selectOption(PORT_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(
      page.locator('select#temporaryAdmissionPortOfExit')
    ).toHaveValue(PORT_CODE)

    await page.goto(reasonUrl)
    await radioFor(page, 'transhipmentOrOnwardTravel').check()
    await page
      .locator('select#transhipmentDestinationCountry')
      .selectOption(COUNTRY_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page).toHaveURL(urlUnderBase(HUB_PATH_PATTERN))
    await page.goto(reasonUrl)
    await expect(
      page.locator('select#transhipmentDestinationCountry')
    ).toHaveValue(COUNTRY_CODE)
  })
})

test.describe('import-reason reveal accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtImportReason(page)
  })

  test('has no serious or critical axe violations with the exit date missing', async ({
    page
  }) => {
    await radioFor(page, 'temporaryAdmissionHorses').check()
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })

  test('has no serious or critical axe violations with a reveal open and in error', async ({
    page
  }) => {
    await radioFor(page, 'transit').check()
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })

  test('has no serious or critical axe violations with the internal-market purpose reveal open', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    const reveal = await revealFor(page, 'internalMarket')
    await expect(reveal).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })

  test('has no serious or critical axe violations with the internal-market purpose reveal in error', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })

  test('has no serious or critical axe violations with the picker dialog open inside a reveal', async ({
    page
  }) => {
    await radioFor(page, 'temporaryAdmissionHorses').check()
    await openDatePicker(page, copy.date.label)

    await expectNoSeriousOrCriticalViolations(page, copy.title)
  })
})
