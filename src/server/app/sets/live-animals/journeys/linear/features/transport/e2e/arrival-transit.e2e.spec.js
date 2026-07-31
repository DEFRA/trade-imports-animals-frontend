import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  journeyUrl,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../e2e/live-animals-journey.js'
import {
  countriesOrigin,
  portsOfEntry
} from '../../../../../../../services/_capture/fixtures.js'
import { validatorDefaults } from '../../../../../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { MAX_TRANSITED_COUNTRIES } from '../transit-countries/transit-countries.controller.js'

const openArrival = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await expect(
    page.getByRole('heading', { name: copy.portOfEntry.title })
  ).toBeVisible()
}

const choosePort = async (page, code = values.portOfEntry) => {
  await page
    .getByLabel(copy.portOfEntry.port.label, { exact: true })
    .selectOption(code)
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
  await page.getByLabel(copy.portOfEntry.arrivalDate.label).fill('03/01/2026')
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

test.describe('arrival details and transit countries', () => {
  test('renders captured port options and all feature copy', async ({
    page
  }) => {
    await openArrival(page)

    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveAccessibleDescription(copy.portOfEntry.arrivalDate.hint)
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
      .locator('select#portOfEntry option')
      .evaluateAll((items) =>
        items.slice(2).map((option) => ({
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
    await expect(page.locator('#portOfEntry')).toHaveValue(values.portOfEntry)
  })

  test('port validation: out-of-list value links to and focuses the cleared select while preserving other values', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    await page.locator('select#portOfEntry').evaluate((select) => {
      select.add(new Option('Invalid port', 'INVALID'))
      select.value = 'INVALID'
    })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#portOfEntry')).toBeFocused()
    await expect(page.locator('#portOfEntry')).toHaveValue('')
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
    await expect(page.locator('#portOfEntry')).toHaveValue(values.portOfEntry)
  })

  test('transport identification validation: over 58 characters links to and focuses the preserved value', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    const invalid = 'I'.repeat(59)
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
    await expect(page.locator('#portOfEntry')).toHaveValue(values.portOfEntry)
  })

  test('transport document validation: over 58 characters links to and focuses the preserved value', async ({
    page
  }) => {
    await openArrival(page)
    await fillValidArrival(page)
    const invalid = 'R'.repeat(59)
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
    await expect(page.locator('#portOfEntry')).toHaveValue(values.portOfEntry)
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
    await page.goto(journeyUrl(page, 'port-of-entry'))
    await expect(
      page.getByRole('heading', { name: copy.portOfEntry.title })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue('03/01/2026')
    await expect(page.locator('select#portOfEntry')).toHaveValue(
      values.portOfEntry
    )
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
      .locator('input[name="transitedCountries"]')
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
    await expect(
      page.locator('input[name="transitedCountries"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="transitedCountries"]:checked')
    ).toHaveCount(0)
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
    await expect(
      page.locator('input[name="transitedCountries"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="transitedCountries"]:checked')
    ).toHaveCount(0)
  })

  test('transit validation: more than 12 countries links to the focused group and preserves selections', async ({
    page
  }) => {
    await openTransit(page)
    const tooMany = countriesOrigin
      .slice(0, MAX_TRANSITED_COUNTRIES + 1)
      .map(({ code }) => code)
    await page.evaluate((codes) => {
      const form = document.querySelector('form')
      for (const checkbox of form.querySelectorAll(
        'input[name="transitedCountries"]'
      )) {
        checkbox.removeAttribute('name')
      }
      for (const code of codes) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'transitedCountries'
        input.value = code
        form.appendChild(input)
      }
    }, tooMany)
    await submit(page)

    const link = errorLink(
      page,
      copy.transitCountries.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="transitedCountries"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="transitedCountries"]:checked')
    ).toHaveCount(MAX_TRANSITED_COUNTRIES + 1)
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
