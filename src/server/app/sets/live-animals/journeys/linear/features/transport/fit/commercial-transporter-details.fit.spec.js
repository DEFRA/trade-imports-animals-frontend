import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  expectPageEndsWithPrimaryAlone,
  journeyUrl,
  signIn,
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'

const form = copy.commercialTransporterDetails
const COMMERCIAL_SLUG = 'transporters/add/commercial'
const NORTHERN_IRELAND = 'Northern Ireland'
const BACK_LINK = '.govuk-back-link'
const approvalNumberInput = '#approvalNumber'

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const openCommercialForm = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await submit(page)
  // The govuk button macro renders an href as a link with role="button".
  await page.getByRole('button', { name: copy.transporters.add }).click()
  await page
    .getByRole('radio', { name: copy.transporterAdd.options.Commercial.text })
    .check()
  await submit(page)
  await expect(page.getByRole('heading', { name: form.title })).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
  expect(
    seriousOrCritical,
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

// Not on the transporter list, so it can only have come from this form.
const validTransporter = {
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: 'Unit 3',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postalOrZipCode: 'BT1 3LG',
  emailAddress: 'movements@lough-neagh.example.com',
  telephoneNumber: '+44 28 9000 0111'
}

const fillTransporter = async (page, transporter = validTransporter) => {
  for (const [field, value] of Object.entries(transporter)) {
    await page.locator(`#${field}`).fill(value)
  }
}

const requiredValidations = [
  [
    'transporter authorisation number',
    'approvalNumber',
    'approvalNumberRequired'
  ],
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postcode or zip code', 'postalOrZipCode', 'postalOrZipCodeRequired'],
  ['email address', 'emailAddress', 'emailRequired'],
  ['phone number', 'telephoneNumber', 'telephoneRequired']
]

const MAX_APPROVAL_NUMBER_LENGTH = 50
const MAX_NAME_OR_ADDRESS_LINE_LENGTH = 255
const MAX_TOWN_OR_COUNTY_LENGTH = 100
const MAX_POSTAL_OR_ZIP_CODE_LENGTH = 12
const MAX_TELEPHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254
const exampleEmailDomain = '@example.com'

const formatValidations = [
  [
    'authorisation number over 50 characters',
    'approvalNumber',
    'A'.repeat(MAX_APPROVAL_NUMBER_LENGTH + 1),
    'approvalNumberMaxLength'
  ],
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
    'postcode or zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1),
    'postalOrZipCodeMaxLength'
  ],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(MAX_EMAIL_LENGTH + 1 - exampleEmailDomain.length)}${exampleEmailDomain}`,
    'emailMaxLength'
  ],
  [
    'phone number over 20 characters',
    'telephoneNumber',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1),
    'telephoneMaxLength'
  ]
]

test.describe('adding a commercial transporter that is not on the list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the commercial branch of the add route opens the form, under the new-transporter caption', async ({
    page
  }) => {
    await openCommercialForm(page)

    await expect(page).toHaveURL(/\/transporters\/add\/commercial$/)
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(form.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.newTransporter
    )
  })

  test('opens with the transporter-authorisation guidance the list states', async ({
    page
  }) => {
    await openCommercialForm(page)

    const banner = page.locator('.govuk-notification-banner')
    await expect(banner).toContainText(form.guidanceTitle)
    await expect(banner).toContainText(
      copy.transporters.guidance.authorisationLead
    )
    for (const condition of copy.transporters.guidance
      .authorisationConditions) {
      await expect(banner).toContainText(condition)
    }
    await expect(banner).toContainText(copy.transporters.guidance.daeraValid)
    await expect(banner).toContainText(copy.transporters.guidance.euNotValid)
    await expect(
      banner.getByRole('link', { name: copy.transporters.guidance.linkText })
    ).toHaveAttribute('href', copy.transporters.guidance.linkHref)
  })

  test('asks for the authorisation number, the name, the address and the contact details', async ({
    page
  }) => {
    await openCommercialForm(page)

    for (const label of Object.values(form.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByRole('heading', { name: form.contactHeading })
    ).toBeVisible()
    await expect(
      page.getByLabel(form.fields.telephoneNumber)
    ).toHaveAccessibleDescription(form.telephoneHint)
  })

  test('fixes the country to Northern Ireland and does not let the trader change it', async ({
    page
  }) => {
    await openCommercialForm(page)

    const country = page.locator('#country')
    await expect(country).toBeDisabled()
    await expect(country).toHaveValue(NORTHERN_IRELAND)
    await expect(country.locator('option')).toHaveCount(1)
    // The disabled control posts nothing, so the value reaches the server on
    // the hidden field beside it.
    await expect(
      page.locator('input[type="hidden"][name="country"]')
    ).toHaveValue(NORTHERN_IRELAND)
  })

  test('the form goes back to the type question', async ({ page }) => {
    await openCommercialForm(page)
    await page.locator(BACK_LINK).click()

    await expect(
      page.getByRole('heading', { name: copy.transporterAdd.title })
    ).toBeVisible()
  })

  test('ends with the primary alone, being reached from the type question', async ({
    page
  }) => {
    await openCommercialForm(page)

    await expectPageEndsWithPrimaryAlone(page)
  })

  test('saves a hand-entered commercial transporter and persists every value', async ({
    page
  }) => {
    await openCommercialForm(page)
    await fillTransporter(page)
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, COMMERCIAL_SLUG))
    for (const [field, value] of Object.entries(validTransporter)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
    await expect(page.locator('#country')).toHaveValue(NORTHERN_IRELAND)
  })

  test('shows a hand-entered transporter on the transporter list as no pick, leaving it alone', async ({
    page
  }) => {
    await openCommercialForm(page)
    await fillTransporter(page)
    await submit(page)

    await page.goto(journeyUrl(page, 'transporters'))
    // A hand-typed record is not on the list, so nothing is checked and the
    // save has no pick to commit.
    await expect(page.locator('input[name="transporter"]:checked')).toHaveCount(
      0
    )
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, COMMERCIAL_SLUG))
    await expect(page.locator(approvalNumberInput)).toHaveValue(
      validTransporter.approvalNumber
    )
  })

  test('a completely blank commercial transporter record is optional', async ({
    page
  }) => {
    await openCommercialForm(page)
    await submit(page)

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })
})

test.describe('commercial transporter required validations', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const [name, field, error] of requiredValidations) {
    test(`commercial transporter validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await openCommercialForm(page)
      await fillTransporter(page)
      await page.locator(`#${field}`).fill('')
      await submit(page)

      const link = errorLink(page, form.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue('')
      await expect(page.locator(approvalNumberInput)).toHaveValue(
        field === 'approvalNumber' ? '' : validTransporter.approvalNumber
      )
    })
  }
})

test.describe('commercial transporter format validations', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const [name, field, invalid, error] of formatValidations) {
    test(`commercial transporter validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await openCommercialForm(page)
      await fillTransporter(page, { ...validTransporter, [field]: invalid })
      await submit(page)

      const link = errorLink(page, form.errors[error])
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue(invalid)
      await expect(page.locator(approvalNumberInput)).toHaveValue(
        field === 'approvalNumber' ? invalid : validTransporter.approvalNumber
      )
    })
  }
})

test.describe('commercial transporter form accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the form has no serious or critical axe violations', async ({
    page
  }) => {
    await openCommercialForm(page)

    await expectAxeClean(page, 'Add commercial transporter')
  })

  test('the form in its error state has no serious or critical axe violations', async ({
    page
  }) => {
    await openCommercialForm(page)
    await fillTransporter(page)
    await page.locator(approvalNumberInput).fill('')
    await submit(page)

    await expect(page.locator('.govuk-error-summary')).toBeVisible()
    await expectAxeClean(page, 'Add commercial transporter in error')
  })
})
