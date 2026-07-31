import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  chooseTodayFromDatePicker,
  journeyUrl,
  startNotification,
  unlockSections,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import {
  countriesOrigin,
  portsOfEntry
} from '../../../services/_capture/fixtures.js'
import { validatorDefaults } from '../../../shared/copy.en.js'
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

test.describe('arrival details and transit countries', () => {
  test('renders captured port options, all feature copy and a working back link', async ({
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

    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('shows every arrival controller validation rule and preserves values', async ({
    page
  }) => {
    await openArrival(page)
    await page.getByLabel(copy.portOfEntry.arrivalDate.label).fill('31/2/2026')
    await page
      .getByLabel(copy.portOfEntry.identification.label)
      .fill('I'.repeat(59))
    await page
      .getByLabel(copy.portOfEntry.documentReference.label)
      .fill('R'.repeat(59))
    await page.locator('select#portOfEntry').evaluate((select) => {
      select.add(new Option('Invalid port', 'INVALID'))
      select.value = 'INVALID'
    })
    await page
      .getByRole('radio', { name: copy.portOfEntry.means.options.AIRPLANE })
      .evaluate((radio) => {
        radio.value = 'INVALID'
        radio.checked = true
      })
    await page.getByRole('button', { name: 'Save and continue' }).click()

    for (const message of [
      copy.portOfEntry.errors.arrivalDateInvalid,
      copy.portOfEntry.errors.identificationMaxLength,
      copy.portOfEntry.errors.documentReferenceMaxLength
    ]) {
      await expect(errorLink(page, message)).toBeVisible()
    }
    await expect(page.locator('#portOfEntry-error')).toContainText(
      validatorDefaults.oneOf
    )
    await expect(page.locator('#meansOfTransport-error')).toContainText(
      validatorDefaults.oneOf
    )
    await expect(
      page.getByLabel(copy.portOfEntry.arrivalDate.label)
    ).toHaveValue('31/2/2026')
    await expect(
      page.getByLabel(copy.portOfEntry.identification.label)
    ).toHaveValue('I'.repeat(59))
    await expect(
      page.getByLabel(copy.portOfEntry.documentReference.label)
    ).toHaveValue('R'.repeat(59))
  })

  test('saves and persists all arrival fields and routes overland transport to transit countries', async ({
    page
  }) => {
    await openArrival(page)
    const arrivalDate = await chooseTodayFromDatePicker(
      page,
      copy.portOfEntry.arrivalDate.label
    )
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
    await page.getByRole('button', { name: 'Save and continue' }).click()

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
    ).toHaveValue(arrivalDate)
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

  test('validates required, invalid and excessive transit-country selections, then saves and persists', async ({
    page
  }) => {
    await openArrival(page)
    await page
      .getByRole('radio', { name: copy.portOfEntry.means.options.ROAD_VEHICLE })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

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
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      errorLink(page, copy.transitCountries.errors.selectAtLeastOne)
    ).toBeVisible()

    await page
      .getByRole('checkbox', { name: 'France' })
      .evaluate((checkbox) => {
        checkbox.value = 'INVALID'
        checkbox.checked = true
      })
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      errorLink(page, copy.transitCountries.errors.fromList)
    ).toBeVisible()

    await page.goto(journeyUrl(page, 'transit-countries'))
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
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      errorLink(
        page,
        copy.transitCountries.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
      )
    ).toBeVisible()

    await page.goto(journeyUrl(page, 'transit-countries'))
    await page.getByRole('checkbox', { name: 'France' }).check()
    await page.getByRole('checkbox', { name: 'Belgium' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: copy.transporters.legend })
    ).toBeVisible()

    await page.goto(journeyUrl(page, 'transit-countries'))
    await expect(page.getByRole('checkbox', { name: 'France' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Belgium' })).toBeChecked()
  })

  test('arrival and transit pages have no serious or critical axe violations', async ({
    page
  }) => {
    await openArrival(page)
    await page.getByRole('button', { name: 'Choose date' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAxeClean(page, 'Arrival details with date picker open')
    await page.getByRole('button', { name: 'Close' }).click()
    await page
      .getByRole('radio', { name: copy.portOfEntry.means.options.ROAD_VEHICLE })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: copy.transitCountries.title })
    ).toBeVisible()
    await expectAxeClean(page, 'Transit countries')
  })
})
