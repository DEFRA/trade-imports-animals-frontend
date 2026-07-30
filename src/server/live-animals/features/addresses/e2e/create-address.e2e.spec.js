import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections
} from '../../../../../../e2e/live-animals-journey.js'
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
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('create address', () => {
  test('renders grounded field copy and a back link to the launching picker', async ({
    page
  }) => {
    await openCreateAddress(page)

    await expect(page.getByText(copy.createAddress.intro)).toBeVisible()
    for (const label of Object.values(copy.createAddress.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByLabel(copy.createAddress.fields.country)
    ).toHaveValue('')
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('heading', { name: copy.parties.consignor.title })
    ).toBeVisible()
  })

  test('shows every mandatory and format validation rule and preserves values', async ({
    page
  }) => {
    await openCreateAddress(page)
    await page
      .getByRole('button', { name: copy.createAddress.saveAndContinue })
      .click()

    const requiredErrors = [
      copy.createAddress.errors.nameRequired,
      copy.createAddress.errors.addressLine1Required,
      copy.createAddress.errors.townOrCityRequired,
      copy.createAddress.errors.postalOrZipCodeRequired,
      copy.createAddress.errors.countryRequired,
      copy.createAddress.errors.telephoneRequired,
      copy.createAddress.errors.emailRequired
    ]
    for (const message of requiredErrors) {
      await expect(errorLink(page, message)).toBeVisible()
    }

    const invalid = {
      nameOrOrganisationName: 'N'.repeat(256),
      addressLine1: 'A'.repeat(256),
      addressLine2: 'B'.repeat(256),
      townOrCity: 'T'.repeat(101),
      county: 'C'.repeat(101),
      postalOrZipCode: 'P'.repeat(13),
      telephoneNumber: '1'.repeat(21),
      emailAddress: `${'e'.repeat(243)}@example.com`
    }
    for (const [field, value] of Object.entries(invalid)) {
      await page.locator(`#${field}`).fill(value)
    }
    await page.locator('#country').evaluate((select) => {
      select.add(new Option('Invalid country', 'Invalid country'))
      select.value = 'Invalid country'
    })
    await page
      .getByRole('button', { name: copy.createAddress.saveAndContinue })
      .click()

    const formatErrors = [
      copy.createAddress.errors.nameMaxLength,
      copy.createAddress.errors.addressLine1MaxLength,
      copy.createAddress.errors.addressLine2MaxLength,
      copy.createAddress.errors.townOrCityMaxLength,
      copy.createAddress.errors.countyMaxLength,
      copy.createAddress.errors.postalOrZipCodeMaxLength,
      copy.createAddress.errors.countryFromList,
      copy.createAddress.errors.telephoneMaxLength,
      copy.createAddress.errors.emailMaxLength
    ]
    for (const message of formatErrors) {
      await expect(errorLink(page, message)).toBeVisible()
    }
    for (const [field, value] of Object.entries(invalid)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
  })

  test('adds the address to the launching party and offers it on return', async ({
    page
  }) => {
    await openCreateAddress(page)
    const created = {
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
    for (const [field, value] of Object.entries(created)) {
      const control = page.locator(`#${field}`)
      if (field === 'country') await control.selectOption(value)
      else await control.fill(value)
    }
    await page
      .getByRole('button', { name: copy.createAddress.saveAndContinue })
      .click()

    const row = rowFor(page, copy.parties.consignor.title)
    await expect(row).toContainText(created.nameOrOrganisationName)
    await row.getByRole('link', { name: copy.hub.change }).click()
    await expect(
      page.getByText(
        `${copy.picker.selectedAddressPrefix} ${created.nameOrOrganisationName}`
      )
    ).toBeVisible()
    await page.getByLabel(copy.picker.search.label).fill('Created Farm')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(
      page.getByRole('radio', { name: created.nameOrOrganisationName })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openCreateAddress(page)
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
