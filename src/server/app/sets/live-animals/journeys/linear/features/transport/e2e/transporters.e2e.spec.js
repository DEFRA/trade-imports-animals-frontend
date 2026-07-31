import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  journeyUrl,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../e2e/live-animals-journey.js'
import { validatorDefaults } from '../../../../../../../shared/copy.en.js'
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

const validPrivateTransporter = {
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '10 Rue de la Ferme',
  addressLine2: 'Bâtiment 2',
  townOrCity: 'Calais',
  county: 'Pas-de-Calais',
  postalOrZipCode: '62100',
  country: 'France',
  telephoneNumber: '+33 3 21 00 00 00',
  emailAddress: 'jean.dupont@example.fr'
}

const fillPrivateTransporter = async (
  page,
  transporter = validPrivateTransporter
) => {
  for (const [field, value] of Object.entries(transporter)) {
    const control = page.locator(`#${field}`)
    if (field === 'country') await control.selectOption(value)
    else await control.fill(value)
  }
}

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const requiredPrivateValidations = [
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postal or zip code', 'postalOrZipCode', 'postalOrZipCodeRequired'],
  ['country', 'country', 'countryRequired'],
  ['telephone number', 'telephoneNumber', 'telephoneRequired'],
  ['email address', 'emailAddress', 'emailRequired']
]

const formatPrivateValidations = [
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

test.describe('transporter pages', () => {
  test('renders transporter guidance and branch options', async ({ page }) => {
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
  })

  test('transporter type validation: out-of-list value links to and focuses the cleared group', async ({
    page
  }) => {
    await openTransporterType(page)
    await page
      .getByRole('radio', { name: copy.transporters.options.Commercial.text })
      .evaluate((radio) => {
        radio.value = 'Invalid transporter type'
        radio.checked = true
      })
    await submit(page)

    const link = errorLink(page, validatorDefaults.oneOf)
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="transporterType"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="transporterType"]:checked')
    ).toHaveCount(0)
  })

  test('private branch selection routes to its details page and persists on back', async ({
    page
  }) => {
    await openTransporterType(page)
    await page
      .getByRole('radio', { name: copy.transporters.options.Private.text })
      .check()
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.privateTransporterDetails.title })
    ).toBeVisible()
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('radio', { name: copy.transporters.options.Private.text })
    ).toBeChecked()
  })

  test('commercial branch selection routes to its address-book page', async ({
    page
  }) => {
    await openTransporterType(page)
    await page
      .getByRole('radio', { name: copy.transporters.options.Commercial.text })
      .check()
    await submit(page)

    await expect(
      page.getByRole('heading', { name: copy.transportersSelect.title })
    ).toBeVisible()
  })

  test('commercial transporter page renders address and approval details', async ({
    page
  }) => {
    await openCommercial(page)
    await expect(page.getByText(copy.transportersSelect.hint)).toBeVisible()

    const selected = values.commercialTransporter
    await expect(page.getByRole('radio', { name: selected.name })).toBeVisible()
    const group = page.getByRole('group', {
      name: copy.transportersSelect.title
    })
    await expect(group).toContainText(selected.address.addressLine1)
    await expect(group).toContainText(selected.address.country)
    await expect(group).toContainText(selected.approvalNumber)
  })

  test('commercial transporter validation: out-of-list value links to and focuses the cleared group', async ({
    page
  }) => {
    await openCommercial(page)
    const selected = values.commercialTransporter
    await page.getByRole('radio', { name: selected.name }).evaluate((radio) => {
      radio.value = 'invalid-transporter'
      radio.checked = true
    })
    await submit(page)

    const link = errorLink(
      page,
      copy.transportersSelect.errors.transporterRequired
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="commercialTransporter"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="commercialTransporter"]:checked')
    ).toHaveCount(0)
  })

  test('commercial transporter selection saves and persists', async ({
    page
  }) => {
    await openCommercial(page)
    const selected = values.commercialTransporter
    await page.getByRole('radio', { name: selected.name }).check()
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, 'transporters/select'))
    await expect(page.getByRole('radio', { name: selected.name })).toBeChecked()
  })

  test('private transporter page renders all address fields and explanatory copy', async ({
    page
  }) => {
    await openPrivate(page)
    await expect(
      page.getByText(copy.privateTransporterDetails.intro)
    ).toBeVisible()
    for (const label of Object.values(copy.privateTransporterDetails.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
  })

  test('a completely blank private transporter record is optional', async ({
    page
  }) => {
    await openPrivate(page)
    await submit(page)

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  for (const [name, field, error] of requiredPrivateValidations) {
    test(`private transporter validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await openPrivate(page)
      await fillPrivateTransporter(page)
      if (field === 'country') await page.locator('#country').selectOption('')
      else await page.locator(`#${field}`).fill('')
      await submit(page)

      const link = errorLink(page, copy.privateTransporterDetails.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue('')
      await expect(page.locator('#addressLine1')).toHaveValue(
        field === 'addressLine1' ? '' : validPrivateTransporter.addressLine1
      )
    })
  }

  for (const [name, field, invalid, error] of formatPrivateValidations) {
    test(`private transporter validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await openPrivate(page)
      await fillPrivateTransporter(page, {
        ...validPrivateTransporter,
        [field]: invalid
      })
      await submit(page)

      const link = errorLink(page, copy.privateTransporterDetails.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue(invalid)
      await expect(page.locator('#addressLine1')).toHaveValue(
        field === 'addressLine1'
          ? invalid
          : validPrivateTransporter.addressLine1
      )
    })
  }

  test('private transporter validation: out-of-list country focuses the cleared select and preserves other values', async ({
    page
  }) => {
    await openPrivate(page)
    await fillPrivateTransporter(page)
    await page.locator('#country').evaluate((select) => {
      select.add(new Option('Invalid country', 'Invalid country'))
      select.value = 'Invalid country'
    })
    await submit(page)

    const link = errorLink(
      page,
      copy.privateTransporterDetails.errors.countryFromList
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#country')).toBeFocused()
    await expect(page.locator('#country')).toHaveValue('')
    await expect(page.locator('#addressLine1')).toHaveValue(
      validPrivateTransporter.addressLine1
    )
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
    await submit(page)
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

  test('transporter type page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterType(page)
    await expectAxeClean(page, 'Transporter type')
  })

  test('commercial transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await openCommercial(page)
    await expectAxeClean(page, 'Commercial transporter')
  })

  test('private transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await openPrivate(page)
    await expectAxeClean(page, 'Private transporter details')
  })
})
