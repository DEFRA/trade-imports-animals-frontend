import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  journeyUrl,
  startNotification,
  unlockSections,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import { validatorDefaults } from '../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'

const openTransporterType = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: copy.transporters.legend })
  ).toBeVisible()
}

const openCommercial = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporters.options.Commercial.text })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: copy.transportersSelect.title })
  ).toBeVisible()
}

const openPrivate = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporters.options.Private.text })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: copy.privateTransporterDetails.title })
  ).toBeVisible()
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

test.describe('transporter pages', () => {
  test('renders transporter guidance, validates the domain and saves the selected branch', async ({
    page
  }) => {
    await openTransporterType(page)

    await expect(
      page.getByText(copy.transporters.guidance.authorisationLead)
    ).toBeVisible()
    for (const condition of copy.transporters.guidance
      .authorisationConditions) {
      await expect(page.getByText(condition)).toBeVisible()
    }
    const guidance = page.getByRole('link', {
      name: copy.transporters.guidance.linkText
    })
    await expect(guidance).toHaveAttribute(
      'href',
      copy.transporters.guidance.linkHref
    )
    await expect(guidance).toHaveAttribute('target', '_blank')
    await expect(
      page.getByText(copy.transporters.guidance.daeraValid)
    ).toBeVisible()
    await expect(
      page.getByText(copy.transporters.guidance.euNotValid)
    ).toBeVisible()
    for (const option of Object.values(copy.transporters.options)) {
      await expect(page.getByRole('radio', { name: option.text })).toBeVisible()
      await expect(page.getByText(option.hint)).toBeVisible()
    }

    await page
      .getByRole('radio', { name: copy.transporters.options.Commercial.text })
      .evaluate((radio) => {
        radio.value = 'Invalid transporter type'
        radio.checked = true
      })
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.locator('#transporterType-error')).toContainText(
      validatorDefaults.oneOf
    )

    await page
      .getByRole('radio', { name: copy.transporters.options.Private.text })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: copy.privateTransporterDetails.title })
    ).toBeVisible()
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('radio', { name: copy.transporters.options.Private.text })
    ).toBeChecked()
  })

  test('renders commercial transporter address and approval details, validates and persists the selection', async ({
    page
  }) => {
    await openCommercial(page)
    await expect(page.getByText(copy.transportersSelect.hint)).toBeVisible()

    const selected = values.commercialTransporter
    const option = page.getByRole('radio', { name: selected.name })
    await expect(option).toBeVisible()
    const optionGroup = option.locator(
      'xpath=ancestor::div[contains(@class,"govuk-radios__item")]'
    )
    await expect(optionGroup).toContainText(selected.address.addressLine1)
    await expect(optionGroup).toContainText(selected.address.country)
    await expect(optionGroup).toContainText(selected.approvalNumber)

    await option.evaluate((radio) => {
      radio.value = 'invalid-transporter'
      radio.checked = true
    })
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      errorLink(page, copy.transportersSelect.errors.transporterRequired)
    ).toBeVisible()

    await page.getByRole('radio', { name: selected.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, 'transporters/select'))
    await expect(page.getByRole('radio', { name: selected.name })).toBeChecked()
  })

  test('allows a blank private record but validates every mandatory and format rule once started', async ({
    page
  }) => {
    await openPrivate(page)
    await expect(
      page.getByText(copy.privateTransporterDetails.intro)
    ).toBeVisible()
    for (const label of Object.values(copy.privateTransporterDetails.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }

    await page
      .getByLabel(copy.privateTransporterDetails.fields.nameOrOrganisationName)
      .fill('Jean Dupont')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    for (const message of Object.values(
      copy.privateTransporterDetails.errors
    ).slice(1, 7)) {
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
    await page.getByRole('button', { name: 'Save and continue' }).click()
    for (const message of [
      copy.privateTransporterDetails.errors.nameMaxLength,
      copy.privateTransporterDetails.errors.addressLine1MaxLength,
      copy.privateTransporterDetails.errors.addressLine2MaxLength,
      copy.privateTransporterDetails.errors.townOrCityMaxLength,
      copy.privateTransporterDetails.errors.countyMaxLength,
      copy.privateTransporterDetails.errors.postalOrZipCodeMaxLength,
      copy.privateTransporterDetails.errors.countryFromList,
      copy.privateTransporterDetails.errors.telephoneMaxLength,
      copy.privateTransporterDetails.errors.emailMaxLength
    ]) {
      await expect(errorLink(page, message)).toBeVisible()
    }
    for (const [field, value] of Object.entries(invalid)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
  })

  test('saves and persists a complete private transporter record', async ({
    page
  }) => {
    await openPrivate(page)
    const transporter = values.privateTransporter
    const fields = {
      nameOrOrganisationName: transporter.name,
      ...transporter.address
    }
    for (const [field, value] of Object.entries(fields)) {
      const control = page.locator(`#${field}`)
      if (field === 'country') await control.selectOption(value)
      else await control.fill(value)
    }
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters/private'))
    await expect(
      page.getByLabel(
        copy.privateTransporterDetails.fields.nameOrOrganisationName
      )
    ).toHaveValue(transporter.name)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.country)
    ).toHaveValue(transporter.address.country)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.emailAddress)
    ).toHaveValue(transporter.address.emailAddress)
  })

  test('all three transporter pages have no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterType(page)
    await expectAxeClean(page, 'Transporter type')
    await page
      .getByRole('radio', { name: copy.transporters.options.Commercial.text })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expectAxeClean(page, 'Commercial transporter')

    await page.locator('.govuk-back-link').click()
    await page
      .getByRole('radio', { name: copy.transporters.options.Private.text })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expectAxeClean(page, 'Private transporter details')
  })
})
