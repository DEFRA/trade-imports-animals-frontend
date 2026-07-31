import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections
} from '../../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const rowFor = (page, title) =>
  page.locator('.govuk-summary-list__row', {
    has: page.getByText(title, { exact: true })
  })

const openCreateAddress = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await rowFor(page, copy.parties.consignor.title)
    .getByRole('link', { name: copy.hub.add })
    .click()
  await page.getByRole('button', { name: copy.picker.addNewAddress }).click()
  await expect(
    page.getByRole('heading', { name: copy.createAddress.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

const validAddress = {
  nameOrOrganisationName: 'Created Farm Ltd',
  addressLine1: '99 New Lane',
  addressLine2: 'Unit 2',
  townOrCity: 'Carlisle',
  county: 'Cumbria',
  postalOrZipCode: 'CA1 1AA',
  country: 'United Kingdom',
  telephoneNumber: '01228 555 0101',
  emailAddress: 'farm@example.co.uk'
}

const fillAddress = async (page, values = validAddress) => {
  for (const [field, value] of Object.entries(values)) {
    const control = page.locator(`#${field}`)
    if (field === 'country') await control.selectOption(value)
    else await control.fill(value)
  }
}

const submit = (page) =>
  page.getByRole('button', { name: copy.createAddress.saveAndContinue }).click()

const requiredValidations = [
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postal or zip code', 'postalOrZipCode', 'postalOrZipCodeRequired'],
  ['country', 'country', 'countryRequired'],
  ['telephone number', 'telephoneNumber', 'telephoneRequired'],
  ['email address', 'emailAddress', 'emailRequired']
]

const formatValidations = [
  [
    'name or organisation name over 255 characters',
    'nameOrOrganisationName',
    'N'.repeat(256),
    'nameMaxLength'
  ],
  [
    'address line 1 over 255 characters',
    'addressLine1',
    'A'.repeat(256),
    'addressLine1MaxLength'
  ],
  [
    'address line 2 over 255 characters',
    'addressLine2',
    'B'.repeat(256),
    'addressLine2MaxLength'
  ],
  [
    'town or city over 100 characters',
    'townOrCity',
    'T'.repeat(101),
    'townOrCityMaxLength'
  ],
  ['county over 100 characters', 'county', 'C'.repeat(101), 'countyMaxLength'],
  [
    'postal or zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(13),
    'postalOrZipCodeMaxLength'
  ],
  [
    'telephone number over 20 characters',
    'telephoneNumber',
    '1'.repeat(21),
    'telephoneMaxLength'
  ],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(243)}@example.com`,
    'emailMaxLength'
  ]
]

test.describe('create address', () => {
  test.beforeEach(async ({ page }) => {
    await openCreateAddress(page)
  })

  test('renders grounded field copy and an empty country select', async ({
    page
  }) => {
    await expect(page.getByText(copy.createAddress.intro)).toBeVisible()
    for (const label of Object.values(copy.createAddress.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByLabel(copy.createAddress.fields.country)
    ).toHaveValue('')
  })

  test('back link returns to the launching party picker', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('heading', { name: copy.parties.consignor.title })
    ).toBeVisible()
  })

  for (const [name, field, error] of requiredValidations) {
    test(`validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await fillAddress(page)
      if (field === 'country') await page.locator('#country').selectOption('')
      else await page.locator(`#${field}`).fill('')
      await submit(page)

      const link = errorLink(page, copy.createAddress.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue('')
      await expect(page.locator('#nameOrOrganisationName')).toHaveValue(
        field === 'nameOrOrganisationName'
          ? ''
          : validAddress.nameOrOrganisationName
      )
    })
  }

  for (const [name, field, value, error] of formatValidations) {
    test(`validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await fillAddress(page, { ...validAddress, [field]: value })
      await submit(page)

      const link = errorLink(page, copy.createAddress.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue(value)
      await expect(page.locator('#nameOrOrganisationName')).toHaveValue(
        field === 'nameOrOrganisationName'
          ? value
          : validAddress.nameOrOrganisationName
      )
    })
  }

  test('validation: an out-of-list country links to and focuses the cleared select while preserving other values', async ({
    page
  }) => {
    await fillAddress(page)
    await page.locator('#country').evaluate((select) => {
      select.add(new Option('Invalid country', 'Invalid country'))
      select.value = 'Invalid country'
    })
    await submit(page)

    const link = errorLink(page, copy.createAddress.errors.countryFromList)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#country')).toBeFocused()
    await expect(page.locator('#country')).toHaveValue('')
    await expect(page.locator('#nameOrOrganisationName')).toHaveValue(
      validAddress.nameOrOrganisationName
    )
  })

  test('adds the address to the launching party and offers it on return', async ({
    page
  }) => {
    await fillAddress(page)
    await submit(page)

    const row = rowFor(page, copy.parties.consignor.title)
    await expect(row).toContainText(validAddress.nameOrOrganisationName)
    await row.getByRole('link', { name: copy.hub.change }).click()
    await expect(
      page.getByText(
        `${copy.picker.selectedAddressPrefix} ${validAddress.nameOrOrganisationName}`
      )
    ).toBeVisible()
    await page.getByLabel(copy.picker.search.label).fill('Created Farm')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(
      page.getByRole('radio', { name: validAddress.nameOrOrganisationName })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Create address has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
