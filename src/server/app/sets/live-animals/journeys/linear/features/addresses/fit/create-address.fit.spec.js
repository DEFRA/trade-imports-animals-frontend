import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const NAME_FIELD = '#nameOrOrganisationName'
const INVALID_COUNTRY = 'Invalid country'

const NAME_MAX_LENGTH = 255
const ADDRESS_LINE_MAX_LENGTH = 255
const TOWN_OR_CITY_MAX_LENGTH = 100
const COUNTY_MAX_LENGTH = 100
const POSTAL_OR_ZIP_MAX_LENGTH = 12
const TELEPHONE_MAX_LENGTH = 20
const EMAIL_MAX_LENGTH = 254
const EMAIL_DOMAIN = '@example.com'

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
    if (field === 'country') {
      await control.selectOption(value)
    } else {
      await control.fill(value)
    }
  }
}

const submit = (page) =>
  page.getByRole('button', { name: copy.createAddress.saveAndContinue }).click()

const expectErrorFocusOn = async (page, error, field, expectedValue) => {
  const link = errorLink(page, copy.createAddress.errors[error])
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
  await expect(page.locator(`#${field}`)).toHaveValue(expectedValue)
}

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
    'N'.repeat(NAME_MAX_LENGTH + 1),
    'nameMaxLength'
  ],
  [
    'address line 1 over 255 characters',
    'addressLine1',
    'A'.repeat(ADDRESS_LINE_MAX_LENGTH + 1),
    'addressLine1MaxLength'
  ],
  [
    'address line 2 over 255 characters',
    'addressLine2',
    'B'.repeat(ADDRESS_LINE_MAX_LENGTH + 1),
    'addressLine2MaxLength'
  ],
  [
    'town or city over 100 characters',
    'townOrCity',
    'T'.repeat(TOWN_OR_CITY_MAX_LENGTH + 1),
    'townOrCityMaxLength'
  ],
  [
    'county over 100 characters',
    'county',
    'C'.repeat(COUNTY_MAX_LENGTH + 1),
    'countyMaxLength'
  ],
  [
    'postal or zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(POSTAL_OR_ZIP_MAX_LENGTH + 1),
    'postalOrZipCodeMaxLength'
  ],
  [
    'telephone number over 20 characters',
    'telephoneNumber',
    '1'.repeat(TELEPHONE_MAX_LENGTH + 1),
    'telephoneMaxLength'
  ],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(EMAIL_MAX_LENGTH - EMAIL_DOMAIN.length + 1)}${EMAIL_DOMAIN}`,
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

test.describe('create address validation', () => {
  test.beforeEach(async ({ page }) => {
    await openCreateAddress(page)
  })

  for (const [name, field, error] of requiredValidations) {
    test(`validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await fillAddress(page)
      if (field === 'country') {
        await page.locator('#country').selectOption('')
      } else {
        await page.locator(`#${field}`).fill('')
      }
      await submit(page)

      await expectErrorFocusOn(page, error, field, '')
      await expect(page.locator(NAME_FIELD)).toHaveValue(
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

      await expectErrorFocusOn(page, error, field, value)
      await expect(page.locator(NAME_FIELD)).toHaveValue(
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
    await page.locator('#country').evaluate((select, invalidCountry) => {
      select.add(new Option(invalidCountry, invalidCountry))
      select.value = invalidCountry
    }, INVALID_COUNTRY)
    await submit(page)

    await expectErrorFocusOn(page, 'countryFromList', 'country', '')
    await expect(page.locator(NAME_FIELD)).toHaveValue(
      validAddress.nameOrOrganisationName
    )
  })
})
