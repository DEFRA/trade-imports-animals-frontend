import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  chooseTodayFromDatePicker
} from '../../../../../../../../../fit/live-animals-journey.js'
import { countriesOrigin } from '../../../../../../services/_capture/fixtures.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const REASON_INPUT_SELECTOR = 'input[name="reasonForImport"]'
const PURPOSE_INPUT_SELECTOR = 'input[name="purposeInInternalMarket"]'
const SUBMIT_BUTTON = 'form button[type="submit"]'
const CHOOSE_DATE_LABEL = 'Choose date'
const PORT_CODE = 'GB DVR'
const COUNTRY_CODE = 'IE'
const TRANSIT_PORT = '#transitPortOfExit'
const TRANSIT_COUNTRY = '#transitDestinationCountry'
const TRANSHIPMENT_COUNTRY = '#transhipmentDestinationCountry'
const TEMPORARY_ADMISSION_DATE = '#temporaryAdmissionExitDate'
const TEMPORARY_ADMISSION_PORT = '#temporaryAdmissionPortOfExit'

// govuk-frontend's own conditional-reveal script puts aria-expanded on the
// radio it belongs to, which axe reads as an attribute a radio may not carry.
// The same filter guards the origin page's axe tests.
const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

const expectNoSeriousOrCriticalAxeViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

  expect(
    seriousOrCritical,
    `Import reason has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const startAtImportReason = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await answerOriginEntry(page)

  await page.goto(reasonUrl)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const radioFor = (page, value) =>
  page.locator(`${REASON_INPUT_SELECTOR}[value="${value}"]`)

/** The reveal a reason opens, found through the radio that controls it — so
 * the lookup only works while the radio really does control a reveal. */
const revealFor = async (page, value) => {
  const controls = await radioFor(page, value).getAttribute('aria-controls')
  expect(controls, `${value} controls a reveal`).toBeTruthy()
  return page.locator(`#${controls}`)
}

const fieldIdsIn = (reveal) =>
  reveal
    .locator('select, input:not([type="hidden"])')
    .evaluateAll((fields) => fields.map((field) => field.id))

test.describe('import-reason feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtImportReason(page)
  })

  test('heads the page with its name and keeps the question as a legend only a screen reader meets', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.legend })).toHaveCount(
      0
    )

    // Hidden from sight, still the group's accessible name.
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

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(reasonUrl)
    await expect(
      page.getByRole('radio', { name: selected.text, exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', { name: purpose.text, exact: true })
    ).toBeChecked()
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/import-reason$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})

test.describe('import-reason reveals', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtImportReason(page)
  })

  test('opens no reveal until a reason that needs one is chosen', async ({
    page
  }) => {
    const transitReveal = await revealFor(page, 'transit')
    await expect(transitReveal).toBeHidden()

    await radioFor(page, 'reEntry').check()
    await expect(transitReveal).toBeHidden()
    await expect(radioFor(page, 'reEntry')).not.toHaveAttribute('aria-controls')
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
    await expect(page.locator(TRANSIT_PORT)).toHaveAccessibleName(
      copy.port.label
    )
    await expect(page.locator(TRANSIT_PORT)).toHaveAccessibleDescription('')
    await expect(page.locator(TRANSIT_COUNTRY)).toHaveAccessibleName(
      copy.country.label
    )
    await expect(page.locator(TRANSIT_COUNTRY)).toHaveAccessibleDescription('')
    const renderedCountries = await page
      .locator(`${TRANSIT_COUNTRY} option`)
      .evaluateAll((options) =>
        options.slice(2).map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )
    expect(renderedCountries).toEqual(countriesOrigin)
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
    await expect(
      page.locator(TEMPORARY_ADMISSION_PORT)
    ).toHaveAccessibleDescription('')
    expect(await fieldIdsIn(reveal)).toEqual([
      'temporaryAdmissionExitDate',
      'temporaryAdmissionPortOfExit'
    ])
  })

  test('asks transhipment for the destination country alone', async ({
    page
  }) => {
    await radioFor(page, 'transhipmentOrOnwardTravel').check()
    const reveal = await revealFor(page, 'transhipmentOrOnwardTravel')

    await expect(reveal).toBeVisible()
    expect(await fieldIdsIn(reveal)).toEqual(['transhipmentDestinationCountry'])
    await expect(page.locator(TRANSHIPMENT_COUNTRY)).toHaveAccessibleName(
      copy.country.label
    )
    await expect(
      page.locator(TRANSHIPMENT_COUNTRY)
    ).toHaveAccessibleDescription('')
  })

  test('saves a reason and its reveal in one submit, and offers the answers back', async ({
    page
  }) => {
    const reasonUrl = page.url()

    await radioFor(page, 'transit').check()
    await page.locator(TRANSIT_PORT).selectOption(PORT_CODE)
    await page.locator(TRANSIT_COUNTRY).selectOption(COUNTRY_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(reasonUrl)
    await expect(radioFor(page, 'transit')).toBeChecked()
    await expect(page.locator(TRANSIT_PORT)).toHaveValue(PORT_CODE)
    await expect(page.locator(TRANSIT_COUNTRY)).toHaveValue(COUNTRY_CODE)
  })

  test('refuses an unanswered reveal, links to the field and keeps the reveal open', async ({
    page
  }) => {
    await radioFor(page, 'transit').check()
    await page.locator(TRANSIT_PORT).selectOption(PORT_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()

    const countryError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(countryError).toBeVisible()
    await countryError.click()
    await expect(page.locator(TRANSIT_COUNTRY)).toBeFocused()
    await expect(page.locator(TRANSIT_PORT)).toHaveValue(PORT_CODE)
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
    await page.locator(TEMPORARY_ADMISSION_PORT).selectOption(PORT_CODE)
    await page.locator(SUBMIT_BUTTON).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(reasonUrl)
    await expect(page.locator(TEMPORARY_ADMISSION_DATE)).toHaveValue(expected)
    await expect(page.locator(TEMPORARY_ADMISSION_PORT)).toHaveValue(PORT_CODE)
  })

  test('has no serious or critical axe violations with a reveal open and in error', async ({
    page
  }) => {
    await radioFor(page, 'transit').check()
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })

  test('has no serious or critical axe violations with the internal-market purpose reveal open', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    const reveal = await revealFor(page, 'internalMarket')
    await expect(reveal).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })

  test('has no serious or critical axe violations with the internal-market purpose reveal in error', async ({
    page
  }) => {
    await radioFor(page, 'internalMarket').check()
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })

  test('has no serious or critical axe violations with the picker dialog open inside a reveal', async ({
    page
  }) => {
    await radioFor(page, 'temporaryAdmissionHorses').check()
    const reveal = await revealFor(page, 'temporaryAdmissionHorses')
    await reveal.getByRole('button', { name: CHOOSE_DATE_LABEL }).click()
    await expect(reveal.getByRole('dialog')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})
