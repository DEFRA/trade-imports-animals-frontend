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
const transitedCountriesInputs = 'input[name="transitedCountries"]'
const transitedCountriesChecked = `${transitedCountriesInputs}:checked`
const MAX_TRANSPORT_FIELD_LENGTH = 58
const DOVER_OPTION = 'Port of Dover (GB DVR)'
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

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

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
  await page
    .getByRole('radio', {
      name: copy.portOfEntry.means.options[values.meansOfTransport]
    })
    .check()
  await page
    .getByLabel(copy.portOfEntry.identification.label)
    .fill(values.transportIdentification)
  await page
    .getByLabel(copy.portOfEntry.documentReference.label)
    .fill(values.transportDocumentReference)
}

const openTransit = async (page) => {
  await openArrival(page)
  await page
    .getByRole('radio', { name: copy.portOfEntry.means.options.ROAD_VEHICLE })
    .check()
  await submit(page)
  await expect(
    page.getByRole('heading', { name: copy.transitCountries.title })
  ).toBeVisible()
}

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
    ).toHaveAccessibleDescription(
      copy.portOfEntry.arrivalDate.hint(dateWindow.minText, dateWindow.maxText)
    )
    await expect(page.getByText(copy.portOfEntry.port.hint)).toBeVisible()
    await expect(
      page.getByRole('group', { name: copy.portOfEntry.means.legend })
    ).toBeVisible()
    for (const label of Object.values(copy.portOfEntry.means.options)) {
      await expect(page.getByRole('radio', { name: label })).toBeVisible()
    }
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveAccessibleDescription(copy.portOfEntry.identification.hint)
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
    await expect(page.getByRole('option')).toHaveCount(portsOfEntry.length)
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
    await page
      .getByRole('radio', {
        name: copy.portOfEntry.means.options[values.meansOfTransport]
      })
      .check()
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

  test('the picker calendar excludes the day before the window and allows the boundary itself', async ({
    page
  }) => {
    await openArrival(page)
    await page.getByRole('button', { name: 'Choose date' }).click()
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
  })

  test('means validation: out-of-list value links to and focuses the cleared group while preserving other values', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page
      .getByRole('radio', { name: copy.portOfEntry.means.options.AIRPLANE })
      .evaluate((radio) => {
        radio.value = 'INVALID'
        radio.checked = true
      })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="meansOfTransport"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="meansOfTransport"]:checked')
    ).toHaveCount(0)
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
    await expect(
      page.getByRole('radio', {
        name: copy.portOfEntry.means.options[values.meansOfTransport]
      })
    ).toBeChecked()
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

  test('transit page renders captured country options and feature copy', async ({
    page
  }) => {
    await openTransit(page)

    await expect(
      page.getByText(copy.transitCountries.betweenCountries)
    ).toBeVisible()
    await expect(page.getByText(copy.transitCountries.excludesUk)).toBeVisible()
    await expect(
      page.getByText(copy.transitCountries.countries.hint)
    ).toBeVisible()
    const countryCodes = await page
      .locator(transitedCountriesInputs)
      .evaluateAll((items) => items.map((item) => item.value))
    expect(countryCodes).toEqual(countriesOrigin.map(({ code }) => code))
  })

  test('transit validation: no countries links to and focuses the empty checkbox group', async ({
    page
  }) => {
    await openTransit(page)
    await submit(page)

    const link = errorLink(page, copy.transitCountries.errors.selectAtLeastOne)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitedCountriesInputs).first()).toBeFocused()
    await expect(page.locator(transitedCountriesChecked)).toHaveCount(0)
  })

  test('transit validation: out-of-list country links to and focuses the cleared checkbox group', async ({
    page
  }) => {
    await openTransit(page)
    await page
      .getByRole('checkbox', { name: 'France' })
      .evaluate((checkbox) => {
        checkbox.value = 'INVALID'
        checkbox.checked = true
      })
    await submit(page)

    const link = errorLink(page, copy.transitCountries.errors.fromList)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitedCountriesInputs).first()).toBeFocused()
    await expect(page.locator(transitedCountriesChecked)).toHaveCount(0)
  })
})

test.describe('transit countries limits and persistence', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('transit validation: more than 12 countries links to the focused group and preserves selections', async ({
    page
  }) => {
    await openTransit(page)
    const tooMany = countriesOrigin
      .slice(0, MAX_TRANSITED_COUNTRIES + 1)
      .map(({ code }) => code)
    await page.evaluate(
      ({ codes, selector }) => {
        const form = document.querySelector('form')
        for (const checkbox of form.querySelectorAll(selector)) {
          checkbox.removeAttribute('name')
        }
        for (const code of codes) {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = 'transitedCountries'
          input.value = code
          form.appendChild(input)
        }
      },
      { codes: tooMany, selector: transitedCountriesInputs }
    )
    await submit(page)

    const link = errorLink(
      page,
      copy.transitCountries.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(transitedCountriesInputs).first()).toBeFocused()
    await expect(page.locator(transitedCountriesChecked)).toHaveCount(
      MAX_TRANSITED_COUNTRIES + 1
    )
  })

  test('saves and persists selected transit countries', async ({ page }) => {
    await openTransit(page)
    await page.getByRole('checkbox', { name: 'France' }).check()
    await page.getByRole('checkbox', { name: 'Belgium' }).check()
    await submit(page)
    await expect(
      page.getByRole('heading', { name: copy.transporters.legend })
    ).toBeVisible()

    await page.goto(journeyUrl(page, 'transit-countries'))
    await expect(page.getByRole('checkbox', { name: 'France' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Belgium' })).toBeChecked()
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
    await page.getByRole('button', { name: 'Choose date' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAxeClean(page, 'Arrival details with date picker open')
  })

  test('transit page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransit(page)
    await expectAxeClean(page, 'Transit countries')
  })
})
