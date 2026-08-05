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

const addressLine1Input = '#addressLine1'
const invalidCountry = 'Invalid country'

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const openTransporterType = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await submit(page)
  await expect(
    page.getByRole('heading', { name: copy.transporters.legend })
  ).toBeVisible()
}

const openCommercial = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporters.options.Commercial.text })
    .check()
  await submit(page)
  await expect(
    page.getByRole('heading', { name: copy.transportersSelect.title })
  ).toBeVisible()
}

const openPrivate = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporters.options.Private.text })
    .check()
  await submit(page)
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
    if (field === 'country') {
      await control.selectOption(value)
    } else {
      await control.fill(value)
    }
  }
}

const requiredPrivateValidations = [
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postal or zip code', 'postalOrZipCode', 'postalOrZipCodeRequired'],
  ['country', 'country', 'countryRequired'],
  ['telephone number', 'telephoneNumber', 'telephoneRequired'],
  ['email address', 'emailAddress', 'emailRequired']
]

const MAX_NAME_OR_ADDRESS_LINE_LENGTH = 255
const MAX_TOWN_OR_COUNTY_LENGTH = 100
const MAX_POSTAL_OR_ZIP_CODE_LENGTH = 12
const MAX_TELEPHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254
const exampleEmailDomain = '@example.com'

const formatPrivateValidations = [
  [
    'name or organisation name over 255 characters',
    'nameOrOrganisationName',
    'N'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'nameMaxLength'
  ],
  [
    'address line 1 over 255 characters',
    'addressLine1',
    'A'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'addressLine1MaxLength'
  ],
  [
    'address line 2 over 255 characters',
    'addressLine2',
    'B'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'addressLine2MaxLength'
  ],
  [
    'town or city over 100 characters',
    'townOrCity',
    'T'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1),
    'townOrCityMaxLength'
  ],
  [
    'county over 100 characters',
    'county',
    'C'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1),
    'countyMaxLength'
  ],
  [
    'postal or zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1),
    'postalOrZipCodeMaxLength'
  ],
  [
    'telephone number over 20 characters',
    'telephoneNumber',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1),
    'telephoneMaxLength'
  ],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(MAX_EMAIL_LENGTH + 1 - exampleEmailDomain.length)}${exampleEmailDomain}`,
    'emailMaxLength'
  ]
]

const expectTransporterGuidance = async (page) => {
  await expect(
    page.getByText(copy.transporters.guidance.authorisationLead)
  ).toBeVisible()
  for (const condition of copy.transporters.guidance.authorisationConditions) {
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
}

const expectBranchOptions = async (page) => {
  for (const option of Object.values(copy.transporters.options)) {
    await expect(page.getByRole('radio', { name: option.text })).toBeVisible()
    await expect(page.getByText(option.hint)).toBeVisible()
  }
}

test.describe('transporter type page', () => {
  test('renders transporter guidance and branch options', async ({ page }) => {
    await openTransporterType(page)

    await expectTransporterGuidance(page)
    await expectBranchOptions(page)
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
})

test.describe('commercial transporter page', () => {
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
})

test.describe('private transporter rendering and optionality', () => {
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
})

test.describe('private transporter required validations', () => {
  for (const [name, field, error] of requiredPrivateValidations) {
    test(`private transporter validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await openPrivate(page)
      await fillPrivateTransporter(page)
      if (field === 'country') {
        await page.locator('#country').selectOption('')
      } else {
        await page.locator(`#${field}`).fill('')
      }
      await submit(page)

      const link = errorLink(page, copy.privateTransporterDetails.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue('')
      await expect(page.locator(addressLine1Input)).toHaveValue(
        field === 'addressLine1' ? '' : validPrivateTransporter.addressLine1
      )
    })
  }
})

test.describe('private transporter format validations', () => {
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
      await expect(page.locator(addressLine1Input)).toHaveValue(
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
    await page.locator('#country').evaluate((select, outOfList) => {
      select.add(new Option(outOfList, outOfList))
      select.value = outOfList
    }, invalidCountry)
    await submit(page)

    const link = errorLink(
      page,
      copy.privateTransporterDetails.errors.countryFromList
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#country')).toBeFocused()
    await expect(page.locator('#country')).toHaveValue('')
    await expect(page.locator(addressLine1Input)).toHaveValue(
      validPrivateTransporter.addressLine1
    )
  })
})

test.describe('private transporter persistence', () => {
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
      if (field === 'country') {
        await control.selectOption(value)
      } else {
        await control.fill(value)
      }
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
})

test.describe('transporter pages accessibility', () => {
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
