import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  ARRIVAL_DATE_IN_WINDOW,
  journeyUrl,
  signIn,
  startNotification,
  unlockSections,
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
import { copy } from '../copy/copy.en.js'
import { arrivalWindow, DAYS_BEFORE } from '../port-of-entry/arrival-window.js'
import { MAX_TRANSITED_COUNTRIES } from '../transit-countries/transit-countries.controller.js'

// accessible-autocomplete enhances the native <select>: the visible combobox
// input keeps the original id, and the native select is hidden and renamed with
// a "-select" suffix (it still submits the port code).
const portInput = 'input#portOfEntry'
const portHidden = 'select#portOfEntry-select'
const meansSelect = 'select#meansOfTransport'
const identificationHint = 'div#transportIdentification-hint'
// Transit countries is a type-ahead over the same native <select> contract:
// the visible combobox input keeps the original id and holds the country name,
// and the native select is hidden and renamed with a "-select" suffix.
const transitCountryInput = 'input#transitedCountry'
const transitCountryHidden = 'select#transitedCountry-select'
// The countries added so far ride with the page as hidden inputs until the
// trader saves.
const transitedCountriesInputs =
  'input[type="hidden"][name="transitedCountries"]'
const transitStatus = '#transit-countries-status'
const transitLimit = '#transit-countries-limit'
const MAX_TRANSPORT_FIELD_LENGTH = 58
const DOVER_OPTION = 'Port of Dover (GB DVR)'
const PORT_OF_ENTRY_PAGE = 'port-of-entry'
// The visually hidden name the MoJ picker gives the button that opens the
// calendar.
const CHOOSE_DATE = 'Choose date'
// govuk-frontend's blue and its shades, as the browser reports them.
const GOVUK_BLUE = 'rgb(29, 112, 184)'
const GOVUK_BLUE_SHADE_25 = 'rgb(22, 84, 138)'
const GOVUK_BLUE_SHADE_50 = 'rgb(15, 56, 92)'
const WHITE = 'rgb(255, 255, 255)'
// The GOV.UK focus colours, as the browser reports them.
const GOVUK_FOCUS = 'rgb(255, 221, 0)'
const GOVUK_FOCUS_TEXT = 'rgb(11, 12, 12)'
// The computed property those colours are read from.
const BACKGROUND_COLOR = 'background-color'

const dateWindow = arrivalWindow()
const outOfRangeError = copy.portOfEntry.errors.arrivalDateOutOfRange(
  dateWindow.minText,
  dateWindow.maxText
)
const justBeforeWindow = formatDateText(addUtcDays(dateWindow.min, -1))
const justAfterWindow = formatDateText(addUtcDays(dateWindow.max, 1))

const inUtc = (options) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })

// The accessible name the MoJ picker gives a day button, assembled the way the
// component assembles it.
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

const openArrival = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await expect(
    page.getByRole('heading', { name: copy.portOfEntry.title })
  ).toBeVisible()
}

const portLabel = (code) => {
  const port = portsOfEntry.find((entry) => entry.code === code)
  return `${port.name} (${port.code})`
}

// Pick a port. With JavaScript the field is the enhanced type-ahead: typing
// the code filters (the code is in the option label), then pick the single
// match. Without JavaScript it stays a native <select>, chosen by its value.
const choosePort = async (page, code = values.portOfEntry) => {
  const field = page.getByLabel(copy.portOfEntry.port.label, { exact: true })
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption(code)
    return
  }
  await field.click()
  await field.fill(code)
  await page.getByRole('option', { name: portLabel(code), exact: true }).click()
}

// Positions measured against the document, not the viewport, so a scroll
// between two measurements cannot make an unmoved element look like it moved.
const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

const computedStyle = (locator, property) =>
  locator.evaluate(
    (el, name) => window.getComputedStyle(el).getPropertyValue(name),
    property
  )

const ERROR_SUMMARY = '.govuk-error-summary'

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY).getByRole('link', { name: message })

const seriousOrCritical = (violations) =>
  violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter(
      (violation) =>
        !(
          violation.id === 'aria-allowed-attr' &&
          violation.nodes.every((node) =>
            /govuk-(radios|checkboxes)__input/.test(node.html)
          )
        )
    )

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    seriousOrCritical(results.violations),
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const fillValidArrival = async (page) => {
  await page
    .getByLabel(copy.portOfEntry.arrivalDate.label)
    .fill(ARRIVAL_DATE_IN_WINDOW)
  await choosePort(page)
  await page.locator(meansSelect).selectOption(values.meansOfTransport)
  await page
    .getByLabel(copy.portOfEntry.identification.label)
    .fill(values.transportIdentification)
  await page
    .getByLabel(copy.portOfEntry.documentReference.label)
    .fill(values.transportDocumentReference)
}

const openTransit = async (page) => {
  await openArrival(page)
  await page.locator(meansSelect).selectOption('ROAD_VEHICLE')
  await submit(page)
  await expect(
    page.getByRole('heading', { name: copy.transitCountries.title })
  ).toBeVisible()
}

const transitField = (page) =>
  page.getByLabel(copy.transitCountries.country.label, { exact: true })

// Add a transit country the way a user does: type part of the name to filter,
// pick the match, then press the button that adds it to the list. Without
// JavaScript the field is still the native select, chosen by option label.
const addTransitCountry = async (page, name) => {
  const field = transitField(page)
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: name })
  } else {
    await field.click()
    await field.fill(name)
    await page.getByRole('option', { name, exact: true }).click()
  }
  await page
    .getByRole('button', { name: copy.transitCountries.add, exact: true })
    .click()
  // The row landing is the post-condition. `addedCountries` reads the hidden
  // inputs with evaluateAll, which does not auto-wait, so without this it can
  // race the form submit and read a document that is still navigating.
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
}

const addedCountries = (page) =>
  page
    .locator(transitedCountriesInputs)
    .evaluateAll((items) => items.map((item) => item.value))

// Put codes into the form the page could not have put there itself. The tamper
// tests are the only way to reach the guards that hold against a submitted list
// no rendering of the page produces.
const forceTransitedCountries = (page, codes) =>
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

    // The hint is a worked example of the date format (design release 1); the
    // window it must fall in is policed by the picker's own bounds below.
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveAccessibleDescription(
      copy.portOfEntry.arrivalDate.hint(dateWindow.exampleText)
    )
    await expect(page.getByText(copy.portOfEntry.port.hint)).toBeVisible()
    // Means of transport is a dropdown: it opens on the placeholder with
    // nothing chosen, and the four options are the reference list in order.
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
    // The transport identification hint is a lead-in sentence plus one bullet
    // per alternative (design release 1), so it is asserted as a list.
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
      .locator(`${portHidden} option`)
      .evaluateAll((items) =>
        items.slice(1).map((option) => ({
          code: option.value,
          label: option.textContent
        }))
      )
    expect(options).toEqual(
      portsOfEntry.map((port) => ({
        code: port.code,
        label: `${port.name} (${port.code})`
      }))
    )
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
    // showAllValues: clicking the field opens the menu with every port,
    // before the user types anything.
    await page.getByLabel(copy.portOfEntry.port.label, { exact: true }).click()
    await expect(
      page.getByRole('option', { name: DOVER_OPTION, exact: true })
    ).toBeVisible()
    // Scoped to the type-ahead's own menu: the means-of-transport dropdown
    // puts options on the page too, and they are not ports.
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(
      portsOfEntry.length
    )
  })

  test('filters by port name or code, case-insensitively (AC1)', async ({
    page
  }) => {
    await openArrival(page)
    const field = page.getByLabel(copy.portOfEntry.port.label, { exact: true })
    const doverOption = page.getByRole('option', {
      name: DOVER_OPTION,
      exact: true
    })

    // Matches part of the port name, case-insensitive.
    await field.fill('DOV')
    await expect(doverOption).toBeVisible()

    // The same field matches by port code.
    await field.fill('gb dvr')
    await expect(doverOption).toBeVisible()
  })

  test('selecting a port shows its name and code and submits the code (AC2)', async ({
    page
  }) => {
    await openArrival(page)
    await choosePort(page, 'GB DVR')
    await expect(page.locator(portInput)).toHaveValue(DOVER_OPTION)
    await expect(page.locator(portHidden)).toHaveValue('GB DVR')
  })

  test('shows the no-results message when nothing matches (AC3)', async ({
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
    await page.locator(meansSelect).selectOption(values.meansOfTransport)
    await page
      .getByLabel(copy.portOfEntry.identification.label)
      .fill(values.transportIdentification)
    await page
      .getByLabel(copy.portOfEntry.documentReference.label)
      .fill(values.transportDocumentReference)
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.transitCountries.title })
    ).toBeVisible()
    await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
    await expect(page.locator('select#portOfEntry')).toHaveValue(
      values.portOfEntry
    )
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
    await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
  })

  test('the open calendar sits in the flow of the page and pushes the port question below it', async ({
    page
  }) => {
    await openArrival(page)
    const port = page.getByLabel(copy.portOfEntry.port.label, { exact: true })
    const closed = await documentTop(port)

    await page.getByRole('button', { name: CHOOSE_DATE }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const calendarBottom = await documentBottom(dialog)
    const open = await documentTop(port)

    // The calendar takes up room rather than floating: the port question moves
    // down the page ...
    expect(open).toBeGreaterThan(closed)
    // ... and starts below the calendar's bottom edge instead of behind it.
    expect(open).toBeGreaterThanOrEqual(calendarBottom)
  })

  test('the button that opens the calendar is a blue button with a white icon', async ({
    page
  }) => {
    await openArrival(page)
    const toggle = page.getByRole('button', { name: CHOOSE_DATE })
    await expect(toggle).toBeVisible()

    expect(await computedStyle(toggle, BACKGROUND_COLOR)).toBe(GOVUK_BLUE)
    // The icon paints itself with currentColor, so the button's text colour is
    // the icon's colour.
    expect(await computedStyle(toggle, 'color')).toBe(WHITE)
    expect(await computedStyle(toggle, 'border-bottom-width')).toBe('0px')
    // The darker blue bottom edge a GOV.UK button carries.
    expect(await computedStyle(toggle, 'box-shadow')).toContain(
      GOVUK_BLUE_SHADE_50
    )

    // Hovering darkens the blue rather than handing hover back to the
    // component's grey default.
    await toggle.hover()
    expect(await computedStyle(toggle, BACKGROUND_COLOR)).toBe(
      GOVUK_BLUE_SHADE_25
    )
    expect(await computedStyle(toggle, 'color')).toBe(WHITE)
  })

  test('the button that opens the calendar keeps the GOV.UK focus indicator', async ({
    page
  }) => {
    await openArrival(page)
    const toggle = page.getByRole('button', { name: CHOOSE_DATE })
    await toggle.focus()

    // The component drops the browser's own focus ring, so our restated focus
    // rule is the only thing drawing the indicator.
    expect(await computedStyle(toggle, BACKGROUND_COLOR)).toBe(GOVUK_FOCUS)
    expect(await computedStyle(toggle, 'color')).toBe(GOVUK_FOCUS_TEXT)
  })

  test('the picker calendar excludes the day before the window and allows the boundary itself', async ({
    page
  }) => {
    await openArrival(page)
    await page.getByRole('button', { name: CHOOSE_DATE }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

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

  // The hint's example is computed rather than hard-coded precisely so it never
  // goes stale into a date the service would then reject.
  test('the worked example in the arrival date hint is itself accepted', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page
      .getByLabel(copy.portOfEntry.arrivalDate.label)
      .fill(dateWindow.exampleText)
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.transitCountries.title })
    ).toBeVisible()
    await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)

    await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue(dateWindow.exampleText)
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
        await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
        await expect(
          page.getByLabel(copy.portOfEntry.identification.label)
        ).toHaveValue(values.transportIdentification)
        await expect(page.locator(meansSelect)).toHaveValue(
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
      await expect(
        page.getByRole('heading', { name: copy.transitCountries.title })
      ).toBeVisible()

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
    await page.locator(portHidden).evaluate((select) => {
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
    await expect(page.locator(meansSelect)).toHaveValue(values.meansOfTransport)
  })

  test('means validation: out-of-list value links to and focuses the cleared dropdown while preserving other values', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page.locator(meansSelect).evaluate((select) => {
      select.add(new Option('Invalid means', 'INVALID'))
      select.value = 'INVALID'
    })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(meansSelect)).toBeFocused()
    await expect(page.locator(meansSelect)).toHaveValue('')
    await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
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
    await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
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
    await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
  })
})

test.describe('arrival save and routing', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves and persists all arrival fields and routes overland transport to transit countries', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.transitCountries.title })
    ).toBeVisible()
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, PORT_OF_ENTRY_PAGE))
    await expect(
      page.getByRole('heading', { name: copy.portOfEntry.title })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue(ARRIVAL_DATE_IN_WINDOW)
    await expect(page.locator(portHidden)).toHaveValue(values.portOfEntry)
    await expect(page.locator(meansSelect)).toHaveValue(values.meansOfTransport)
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
    // Nothing added yet, so there is no table to read back — just the sentence
    // that says so, and no cap stated up front.
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

  test('filters the country list by what the user types (AC1)', async ({
    page
  }) => {
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

  // The question is asked overland but never compulsory, so an empty list is
  // an answer: continuing without adding a country saves it and moves on.
  test('transit countries are optional: continuing with none saves and goes on', async ({
    page
  }) => {
    await openTransit(page)
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.transporters.title, exact: true })
    ).toBeVisible()
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
    await forceTransitedCountries(page, ['INVALID'])
    await submit(page)

    const link = errorLink(page, copy.transitCountries.errors.fromList)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitCountryInput)).toBeFocused()
    // The refused value does not survive the re-render: a code the list does
    // not contain is never rendered back.
    expect(await addedCountries(page)).toEqual([])
    await expect(page.getByRole('cell', { name: 'INVALID' })).toHaveCount(0)
  })

  test('transit validation: a tampered country code is never reflected as markup', async ({
    page
  }) => {
    await openTransit(page)
    await forceTransitedCountries(page, [
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

  test('adding a country lists it with its own Remove control and announces it (AC2)', async ({
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
    // The mechanism, not just the string: strip the ARIA attributes and this
    // region stops being a status, whatever text it ends up holding.
    const statusRegion = page.locator(transitStatus)
    await expect(statusRegion).toHaveAttribute('role', 'status')
    await expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    await expect(statusRegion).toHaveAttribute('aria-atomic', 'true')
    // The message ships in the attribute and is written into the region after
    // load — content already there at parse is not announced.
    await expect(statusRegion).toHaveAttribute(
      'data-message',
      copy.transitCountries.added('France')
    )
    await expect(page.locator(transitStatus)).toHaveText(
      copy.transitCountries.added('France')
    )
    // The search box is cleared and ready for the next one.
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

  test('the twelfth country takes the search away and announces the limit (AC3)', async ({
    page
  }) => {
    await openTransit(page)
    const before = countriesOrigin.slice(0, MAX_TRANSITED_COUNTRIES - 1)
    const last = countriesOrigin[MAX_TRANSITED_COUNTRIES - 1]
    await forceTransitedCountries(
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
    // On the page for anyone reading it, and in the live region for anyone
    // who will not see it appear.
    await expect(page.locator(transitLimit)).toHaveText(limit)
    await expect(page.locator(transitStatus)).toContainText(limit)
    // The country that reached the cap is said in the same breath as the cap.
    await expect(page.locator(transitStatus)).toContainText(
      copy.transitCountries.added(last.name)
    )

    // Removing one brings the search back, so a thirteenth is never offered
    // and a swap is always possible.
    await removeControl(page, last.name).click()
    await expect(transitField(page)).toBeVisible()
  })

  test('transit validation: more than 12 countries links to and focuses the search box', async ({
    page
  }) => {
    await openTransit(page)
    await forceTransitedCountries(
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
    await expect(
      page.getByRole('heading', { name: copy.transporters.title, exact: true })
    ).toBeVisible()

    await page.goto(journeyUrl(page, 'transit-countries'))
    await expect(
      page.getByRole('cell', { name: 'France', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Belgium', exact: true })
    ).toBeVisible()
    // Nothing is announced on a fresh load — the live region only speaks for a
    // change the trader has just made.
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
    await expect(
      page.getByRole('heading', { name: copy.transporters.title, exact: true })
    ).toBeVisible()
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
    await page.getByRole('button', { name: CHOOSE_DATE }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAxeClean(page, 'Arrival details with date picker open')
  })

  test('transit page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await expectAxeClean(page, 'Transit countries')
  })

  test('transit page with a country added has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await addTransitCountry(page, 'France')
    await expect(removeControl(page, 'France')).toBeVisible()
    await expectAxeClean(page, 'Transit countries with a country added')
  })

  test('transit page with an empty Add attempt has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await page
      .getByRole('button', { name: copy.transitCountries.add, exact: true })
      .click()
    await expect(page.locator(ERROR_SUMMARY)).toBeVisible()
    await expectAxeClean(page, 'Transit countries with a validation error')
  })
})
