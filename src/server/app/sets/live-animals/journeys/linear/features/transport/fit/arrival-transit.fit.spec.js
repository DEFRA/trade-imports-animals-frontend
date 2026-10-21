import { expect, test } from '@playwright/test'
import {
  ARRIVAL_DATE_IN_WINDOW,
  MEANS_OF_TRANSPORT_SELECT,
  addTransitCountry,
  choosePortOfEntry,
  computedStyle,
  describeDatePickerLook,
  expectOverview,
  expectNoSeriousOrCriticalViolations,
  journeyUrl,
  openArrival,
  openDatePicker,
  openTransit,
  signIn,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import {
  countriesOrigin,
  portsOfEntry
} from '../../../../../../../services/_capture/fixtures.js'
import {
  addUtcDays,
  formatDateText
} from '../../../../../../../lib/validate/calendar.js'
import { validatorDefaults } from '../../../../../../../shared/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { arrivalWindow, DAYS_BEFORE } from '../port-of-entry/arrival-window.js'
import { MAX_TRANSITED_COUNTRIES } from '../transit-countries/transit-countries.controller.js'

const portInput = 'input#portOfEntry'
const portNativeSelect = 'select#portOfEntry-select'
const identificationHint = 'div#transportIdentification-hint'
const documentReferenceHint = 'div#transportDocumentReference-hint'
const transitCountryInput = 'input#transitedCountry'
const transitCountryHidden = 'select#transitedCountry-select'
const transitedCountriesInputs =
  'input[type="hidden"][name="transitedCountries"]'
const transitStatus = '#transit-countries-status'
const transitLimit = '#transit-countries-limit'
const MAX_TRANSPORT_FIELD_LENGTH = 58
const DOVER_OPTION = 'Port of Dover - GB DVR'
const PORT_OF_ENTRY_PAGE = 'port-of-entry'

const dateWindow = arrivalWindow()
const outOfRangeError = copy.portOfEntry.errors.arrivalDateOutOfRange(
  dateWindow.minText,
  dateWindow.maxText
)
const justBeforeWindow = formatDateText(addUtcDays(dateWindow.min, -1))
const justAfterWindow = formatDateText(addUtcDays(dateWindow.max, 1))

const inUtc = (options) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })

const dayLabel = (date) =>
  `${inUtc({ weekday: 'long' }).format(date)} ${date.getUTCDate()} ${inUtc({ month: 'long' }).format(date)} ${date.getUTCFullYear()}`

const showMonth = async (page, target, from) => {
  const months =
    (target.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - from.getUTCMonth())
  const name = months < 0 ? 'Previous month' : 'Next month'
  for (let step = 0; step < Math.abs(months); step++) {
    await page.getByRole('button', { name }).click()
  }
}

const ERROR_SUMMARY = '.govuk-error-summary'

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY).getByRole('link', { name: message })

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const fillTransportDetails = async (page) => {
  await page
    .locator(MEANS_OF_TRANSPORT_SELECT)
    .selectOption(values.meansOfTransport)
  await page
    .getByLabel(copy.portOfEntry.identification.label)
    .fill(values.transportIdentification)
  await page
    .getByLabel(copy.portOfEntry.documentReference.label)
    .fill(values.transportDocumentReference)
}

const fillValidArrival = async (page) => {
  await page
    .getByLabel(copy.portOfEntry.arrivalDate.label)
    .fill(ARRIVAL_DATE_IN_WINDOW)
  await choosePortOfEntry(page)
  await fillTransportDetails(page)
}

const transitField = (page) =>
  page.getByLabel(copy.transitCountries.country.label, { exact: true })

const addedCountries = (page) =>
  page
    .locator(transitedCountriesInputs)
    .evaluateAll((items) => items.map((item) => item.value))

const submitTransitedCountriesTheFormCannotProduce = (page, codes) =>
  page.evaluate(
    ({ wanted, selector }) => {
      const form = document.querySelector('form')
      for (const input of form.querySelectorAll(selector)) {
        input.remove()
      }
      for (const code of wanted) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'transitedCountries'
        input.value = code
        form.appendChild(input)
      }
    },
    { wanted: codes, selector: transitedCountriesInputs }
  )

const removeControl = (page, name) =>
  page.getByRole('button', { name: `Remove ${name}` })

test.describe('arrival details rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders captured port options and all feature copy', async ({
    page
  }) => {
    await openArrival(page)

    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveAccessibleDescription(copy.portOfEntry.arrivalDate.hint)
    await expect(page.getByText(copy.portOfEntry.port.hint)).toBeVisible()
    const means = page.getByLabel(copy.portOfEntry.means.label, { exact: true })
    await expect(means).toBeVisible()
    await expect(means).toHaveValue('')
    const meansOptions = await means
      .locator('option')
      .evaluateAll((items) => items.map((option) => option.textContent.trim()))
    expect(meansOptions).toEqual([
      copy.portOfEntry.means.placeholder,
      ...Object.values(copy.portOfEntry.means.options)
    ])
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveAttribute('aria-describedby', /transportIdentification-hint/)
    await expect(page.locator(`${identificationHint} p`)).toHaveText(
      copy.portOfEntry.identification.hint.lead
    )
    await expect(
      page.locator(`${identificationHint} ul.govuk-list--bullet li`)
    ).toHaveText(copy.portOfEntry.identification.hint.items)
    await expect(
      page.getByLabel(copy.portOfEntry.documentReference.label)
    ).toHaveAccessibleDescription(copy.portOfEntry.documentReference.hint)

    const options = await page
      .locator(`${portNativeSelect} option`)
      .evaluateAll((items) =>
        items.slice(1).map((option) => ({
          code: option.value,
          label: option.textContent
        }))
      )
    expect(options).toEqual(
      portsOfEntry.map((port) => ({
        code: port.code,
        label: `${port.name} - ${port.code}`
      }))
    )
  })

  for (const fieldId of [
    'arrivalDateAtPort',
    'portOfEntry',
    'meansOfTransport',
    'transportIdentification',
    'transportDocumentReference'
  ]) {
    test(`sets the ${fieldId} question label in the medium GOV.UK label size`, async ({
      page
    }) => {
      await openArrival(page)

      await expect(page.locator(`label[for="${fieldId}"]`)).toHaveClass(
        /govuk-label--m/
      )
    })
  }

  test('shows the identification lead-in and every list item in the same colour as the document reference hint', async ({
    page
  }) => {
    await openArrival(page)

    const hintColour = await computedStyle(
      page.locator(documentReferenceHint),
      'color'
    )
    await expect(page.locator(`${identificationHint} p`)).toHaveCount(1)
    expect(
      await computedStyle(page.locator(`${identificationHint} p`), 'color')
    ).toBe(hintColour)
    for (const item of await page.locator(`${identificationHint} li`).all()) {
      expect(await computedStyle(item, 'color')).toBe(hintColour)
    }
  })

  test('arrival back link returns to the overview', async ({ page }) => {
    await openArrival(page)
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })
})

test.describe('port of entry type-ahead', () => {
  test('shows the full list of ports on focus', async ({ page }) => {
    await openArrival(page)
    await page.getByLabel(copy.portOfEntry.port.label, { exact: true }).click()
    await expect(
      page.getByRole('option', { name: DOVER_OPTION, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(
      portsOfEntry.length
    )
  })

  test('filters by port name or code, case-insensitively', async ({ page }) => {
    await openArrival(page)
    const field = page.getByLabel(copy.portOfEntry.port.label, { exact: true })
    const doverOption = page.getByRole('option', {
      name: DOVER_OPTION,
      exact: true
    })

    await field.fill('DOV')
    await expect(doverOption).toBeVisible()

    await field.fill('gb dvr')
    await expect(doverOption).toBeVisible()
  })

  test('selecting a port shows its name and code and submits the code', async ({
    page
  }) => {
    await openArrival(page)
    await choosePortOfEntry(page, DOVER_OPTION)
    await expect(page.locator(portInput)).toHaveValue(DOVER_OPTION)
    await expect(page.locator(portNativeSelect)).toHaveValue('GB DVR')
  })

  test('shows the no-results message when nothing matches', async ({
    page
  }) => {
    await openArrival(page)
    await page
      .getByLabel(copy.portOfEntry.port.label, { exact: true })
      .fill('zzzzzz')
    await expect(page.getByText(copy.portOfEntry.port.noResults)).toBeVisible()
  })
})

test.describe('port of entry without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('native select submits and persists the port code (no-JS fallback)', async ({
    page
  }) => {
    await openArrival(page)
    await page
      .getByLabel(copy.portOfEntry.arrivalDate.label)
      .fill(ARRIVAL_DATE_IN_WINDOW)
    await page
      .getByLabel(copy.portOfEntry.port.label, { exact: true })
      .selectOption(values.portOfEntry)
    await fillTransportDetails(page)
    await submit(page)

    await expectOverview(page)
    await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
    await expect(page.locator('select#portOfEntry')).toHaveValue(
      values.portOfEntry
    )
  })
})

test.describe('arrival date calendar', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openArrival(page)
  })

  describeDatePickerLook({
    fieldName: 'arrival date',
    label: copy.portOfEntry.arrivalDate.label,
    nextQuestionLabel: (page) => page.locator('label[for="portOfEntry"]')
  })
})

test.describe('arrival details validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('arrival date validation: impossible date links to and focuses the preserved value', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page.getByLabel(copy.portOfEntry.arrivalDate.label).fill('31/2/2026')
    await submit(page)

    const link = errorLink(page, copy.portOfEntry.errors.arrivalDateInvalid)
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toBeFocused()
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue('31/2/2026')
    await expect(page.locator(portNativeSelect)).toHaveValue(values.portOfEntry)
  })

  test('the picker calendar excludes the day before the window and allows the boundary itself', async ({
    page
  }) => {
    await openArrival(page)
    await openDatePicker(page, copy.portOfEntry.arrivalDate.label)

    const today = addUtcDays(dateWindow.min, DAYS_BEFORE)
    const dayBefore = addUtcDays(dateWindow.min, -1)

    await showMonth(page, dayBefore, today)
    await expect(
      page.getByRole('button', {
        name: `Excluded date, ${dayLabel(dayBefore)}`
      })
    ).toBeVisible()

    await showMonth(page, dateWindow.min, dayBefore)
    const boundary = page.getByRole('button', {
      name: dayLabel(dateWindow.min),
      exact: true
    })
    await boundary.click()

    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue(dateWindow.minText)
  })

  test.describe('arrival date out of the allowed window', () => {
    for (const [bound, value] of [
      ['before the earliest allowed date', justBeforeWindow],
      ['after the latest allowed date', justAfterWindow]
    ]) {
      test(`a typed date ${bound} links to and focuses the preserved value`, async ({
        page
      }) => {
        await openArrival(page)
        await fillValidArrival(page)
        await page.getByLabel(copy.portOfEntry.arrivalDate.label).fill(value)
        await submit(page)

        const link = errorLink(page, outOfRangeError)
        await expect(link).toBeVisible()
        await link.click()
        await expect(
          page.getByLabel(copy.portOfEntry.arrivalDate.label)
        ).toBeFocused()
        await expect(
          page.getByLabel(copy.portOfEntry.arrivalDate.label)
        ).toHaveValue(value)
        await expect(page.locator(portNativeSelect)).toHaveValue(
          values.portOfEntry
        )
        await expect(
          page.getByLabel(copy.portOfEntry.identification.label)
        ).toHaveValue(values.transportIdentification)
        await expect(page.locator(MEANS_OF_TRANSPORT_SELECT)).toHaveValue(
          values.meansOfTransport
        )
      })
    }
  })

  test.describe('arrival date without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('the arrival date stays an editable text input that saves an in-window date', async ({
      page
    }) => {
      await openArrival(page)

      const input = page.getByLabel(copy.portOfEntry.arrivalDate.label)
      await expect(input).toBeEditable()
      await expect(input).toHaveAttribute('type', 'text')

      await fillValidArrival(page)
      await submit(page)
      await expectOverview(page)

      await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
      await expect(
        page.getByLabel(copy.portOfEntry.arrivalDate.label)
      ).toHaveValue(ARRIVAL_DATE_IN_WINDOW)
    })
  })

  test('port validation: out-of-list value links to and focuses the cleared field while preserving other values', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page.locator(portNativeSelect).evaluate((select) => {
      select.add(new Option('Invalid port', 'INVALID'))
      select.value = 'INVALID'
    })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(portInput)).toBeFocused()
    await expect(page.locator(portInput)).toHaveValue('')
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveValue(values.transportIdentification)
    await expect(page.locator(MEANS_OF_TRANSPORT_SELECT)).toHaveValue(
      values.meansOfTransport
    )
  })

  test('means validation: out-of-list value links to and focuses the cleared dropdown while preserving other values', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page.locator(MEANS_OF_TRANSPORT_SELECT).evaluate((select) => {
      select.add(new Option('Invalid means', 'INVALID'))
      select.value = 'INVALID'
    })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(MEANS_OF_TRANSPORT_SELECT)).toBeFocused()
    await expect(page.locator(MEANS_OF_TRANSPORT_SELECT)).toHaveValue('')
    await expect(page.locator(portNativeSelect)).toHaveValue(values.portOfEntry)
  })
})

test.describe('arrival transport reference validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('transport identification validation: over 58 characters links to and focuses the preserved value', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    const invalid = 'I'.repeat(MAX_TRANSPORT_FIELD_LENGTH + 1)
    await page.getByLabel(copy.portOfEntry.identification.label).fill(invalid)
    await submit(page)

    const link = errorLink(
      page,
      copy.portOfEntry.errors.identificationMaxLength
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toBeFocused()
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveValue(invalid)
    await expect(page.locator(portNativeSelect)).toHaveValue(values.portOfEntry)
  })

  test('transport document validation: over 58 characters links to and focuses the preserved value', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    const invalid = 'R'.repeat(MAX_TRANSPORT_FIELD_LENGTH + 1)
    await page
      .getByLabel(copy.portOfEntry.documentReference.label)
      .fill(invalid)
    await submit(page)

    const link = errorLink(
      page,
      copy.portOfEntry.errors.documentReferenceMaxLength
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.getByLabel(copy.portOfEntry.documentReference.label)
    ).toBeFocused()
    await expect(
      page.getByLabel(copy.portOfEntry.documentReference.label)
    ).toHaveValue(invalid)
    await expect(page.locator(portNativeSelect)).toHaveValue(values.portOfEntry)
  })
})

test.describe('arrival save and routing', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves and persists all arrival fields and returns to the overview, which offers transit countries for overland transport', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await submit(page)

    await expectOverview(page)
    await expect(
      page.getByRole('link', {
        name: hubCopy.rows.transitCountries.title,
        exact: true
      })
    ).toBeVisible()
    await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
    await expect(
      page.getByRole('heading', { name: copy.portOfEntry.title })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue(ARRIVAL_DATE_IN_WINDOW)
    await expect(page.locator(portNativeSelect)).toHaveValue(values.portOfEntry)
    await expect(page.locator(MEANS_OF_TRANSPORT_SELECT)).toHaveValue(
      values.meansOfTransport
    )
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveValue(values.transportIdentification)
    await expect(
      page.getByLabel(copy.portOfEntry.documentReference.label)
    ).toHaveValue(values.transportDocumentReference)
  })
})

test.describe('transit countries rendering and validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('transit page asks for one country at a time and starts with an empty list', async ({
    page
  }) => {
    await openTransit(page)

    await expect(
      page.getByText(copy.transitCountries.betweenCountries)
    ).toBeVisible()
    await expect(page.getByText(copy.transitCountries.excludesUk)).toBeVisible()
    await expect(transitField(page)).toBeVisible()
    await expect(
      page.getByText(copy.transitCountries.country.hint)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.transitCountries.add, exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.transitCountries.empty)).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(
      page.getByText(
        copy.transitCountries.limitReached(MAX_TRANSITED_COUNTRIES)
      )
    ).toHaveCount(0)
  })

  test('the transit type-ahead offers every captured country behind a search placeholder', async ({
    page
  }) => {
    await openTransit(page)

    const options = await page
      .locator(`${transitCountryHidden} option`)
      .evaluateAll((items) =>
        items.map((option) => ({
          code: option.value,
          label: option.textContent.trim()
        }))
      )
    expect(options[0]).toEqual({
      code: '',
      label: copy.transitCountries.country.placeholder
    })
    expect(options.slice(1)).toEqual(
      countriesOrigin.map(({ code, name }) => ({ code, label: name }))
    )
  })

  test('filters the country list by what the user types', async ({ page }) => {
    await openTransit(page)
    const field = transitField(page)

    await field.fill('fran')
    await expect(
      page.getByRole('option', { name: 'France', exact: true })
    ).toBeVisible()

    await field.fill('zzzzzz')
    await expect(
      page.getByText(copy.transitCountries.country.noResults)
    ).toBeVisible()
  })

  test('transit countries are optional: continuing with none saves and returns to the overview', async ({
    page
  }) => {
    await openTransit(page)
    await submit(page)

    await expectOverview(page)
    await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)

    await page.goto(journeyUrl(page, 'transit-countries'))
    await expect(page.getByText(copy.transitCountries.empty)).toBeVisible()
    expect(await addedCountries(page)).toEqual([])
  })

  test('transit validation: pressing Add with nothing chosen links to and focuses the search box', async ({
    page
  }) => {
    await openTransit(page)
    await page
      .getByRole('button', { name: copy.transitCountries.add, exact: true })
      .click()

    const link = errorLink(page, copy.transitCountries.errors.chooseCountry)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitCountryInput)).toBeFocused()
  })

  test('transit validation: a country already added is refused by name', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')
    await addTransitCountry(page, 'France')

    await expect(
      errorLink(page, copy.transitCountries.errors.alreadyAdded('France'))
    ).toBeVisible()
    expect(await addedCountries(page)).toEqual(['FR'])
  })

  test('transit validation: out-of-list country links to and focuses the search box', async ({
    page
  }) => {
    await openTransit(page)
    await submitTransitedCountriesTheFormCannotProduce(page, ['INVALID'])
    await submit(page)

    const link = errorLink(page, copy.transitCountries.errors.fromList)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitCountryInput)).toBeFocused()
    expect(await addedCountries(page)).toEqual([])
    await expect(page.getByRole('cell', { name: 'INVALID' })).toHaveCount(0)
  })

  test('transit validation: a tampered country code is never reflected as markup', async ({
    page
  }) => {
    await openTransit(page)
    await submitTransitedCountriesTheFormCannotProduce(page, [
      '"><img src=x onerror="window.__xss=1">'
    ])
    await submit(page)

    await expect(
      errorLink(page, copy.transitCountries.errors.fromList)
    ).toBeVisible()
    await expect(page.locator('form img')).toHaveCount(0)
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()
    expect(await addedCountries(page)).toEqual([])
  })
})

test.describe('transit countries list, limits and persistence', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('adding a country lists it with its own Remove control and announces it', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')

    await expect(
      page.getByRole('columnheader', {
        name: copy.transitCountries.table.country
      })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'France', exact: true })
    ).toBeVisible()
    await expect(removeControl(page, 'France')).toBeVisible()
    const statusRegion = page.locator(transitStatus)
    await expect(statusRegion).toHaveAttribute('role', 'status')
    await expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    await expect(statusRegion).toHaveAttribute('aria-atomic', 'true')
    await expect(statusRegion).toHaveAttribute(
      'data-message',
      copy.transitCountries.added('France')
    )
    await expect(page.locator(transitStatus)).toHaveText(
      copy.transitCountries.added('France')
    )
    await expect(page.locator(transitCountryInput)).toHaveValue('')
    expect(await addedCountries(page)).toEqual(['FR'])
  })

  test('removing a country takes its row away and announces it', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')
    await addTransitCountry(page, 'Belgium')
    await removeControl(page, 'France').click()

    await expect(
      page.getByRole('cell', { name: 'France', exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByRole('cell', { name: 'Belgium', exact: true })
    ).toBeVisible()
    await expect(page.locator(transitStatus)).toHaveText(
      copy.transitCountries.removed('France')
    )
    expect(await addedCountries(page)).toEqual(['BE'])
  })

  test('the twelfth country takes the search away and announces the limit', async ({
    page
  }) => {
    await openTransit(page)
    const before = countriesOrigin.slice(0, MAX_TRANSITED_COUNTRIES - 1)
    const last = countriesOrigin[MAX_TRANSITED_COUNTRIES - 1]
    await submitTransitedCountriesTheFormCannotProduce(
      page,
      before.map(({ code }) => code)
    )
    await addTransitCountry(page, last.name)

    expect(await addedCountries(page)).toHaveLength(MAX_TRANSITED_COUNTRIES)
    await expect(page.locator(transitCountryInput)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.transitCountries.add, exact: true })
    ).toHaveCount(0)
    const limit = copy.transitCountries.limitReached(MAX_TRANSITED_COUNTRIES)
    await expect(page.locator(transitLimit)).toHaveText(limit)
    await expect(page.locator(transitStatus)).toContainText(limit)
    await expect(page.locator(transitStatus)).toContainText(
      copy.transitCountries.added(last.name)
    )

    await removeControl(page, last.name).click()
    await expect(transitField(page)).toBeVisible()
  })

  test('transit validation: more than 12 countries links to and focuses the search box', async ({
    page
  }) => {
    await openTransit(page)
    await submitTransitedCountriesTheFormCannotProduce(
      page,
      countriesOrigin
        .slice(0, MAX_TRANSITED_COUNTRIES + 1)
        .map(({ code }) => code)
    )
    await submit(page)

    const link = errorLink(
      page,
      copy.transitCountries.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitCountryInput)).toBeFocused()
    expect(await addedCountries(page)).toHaveLength(MAX_TRANSITED_COUNTRIES + 1)
  })

  test('saves and persists the countries that were added', async ({ page }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')
    await addTransitCountry(page, 'Belgium')
    await submit(page)
    await expectOverview(page)

    await page.goto(journeyUrl(page, 'transit-countries'))
    await expect(
      page.getByRole('cell', { name: 'France', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Belgium', exact: true })
    ).toBeVisible()
    await expect(page.locator(transitStatus)).toHaveText('')
  })
})

test.describe('transit countries without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the native select adds a country and the list still reads back', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')

    await expect(
      page.getByRole('cell', { name: 'France', exact: true })
    ).toBeVisible()
    await submit(page)
    await expectOverview(page)
  })
})

test.describe('arrival and transit accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('arrival page with date picker has no serious or critical axe violations', async ({
    page
  }) => {
    await openArrival(page)
    await openDatePicker(page, copy.portOfEntry.arrivalDate.label)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Arrival details with date picker open'
    )
  })

  test('transit page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await expectNoSeriousOrCriticalViolations(page, 'Transit countries')
  })

  test('transit page with a country added has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')
    await expect(removeControl(page, 'France')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Transit countries with a country added'
    )
  })

  test('transit page with an empty Add attempt has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await page
      .getByRole('button', { name: copy.transitCountries.add, exact: true })
      .click()
    await expect(page.locator(ERROR_SUMMARY)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Transit countries with a validation error'
    )
  })
})
