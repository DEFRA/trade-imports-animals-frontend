import { expect, test } from '@playwright/test'
import {
  BASE,
  answerTransporterType,
  cancelAndReturnToDashboard,
  expectNoSeriousOrCriticalViolations,
  expectPageEndsWithPrimaryAndCancel,
  expectTransporterListShowsAddedBanner,
  journeyUrl,
  saveAndContinue,
  signIn,
  signInWithOwnTransporterStore
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { COMMERCIAL } from '../../../../../../../services/transporters/index.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import {
  addressOverLengthValidations,
  contactOverLengthValidations
} from './test-support.js'

const form = copy.commercialTransporterDetails
const COMMERCIAL_SLUG = 'transporters/add/commercial'
const NORTHERN_IRELAND = 'Northern Ireland'
const BACK_LINK = '.govuk-back-link'
const ERROR_SUMMARY = '.govuk-error-summary'
const approvalNumberInput = '#approvalNumber'

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY).getByRole('link', { name: message })

const validTransporter = {
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: 'Unit 3',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postcode: 'BT1 3LG',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
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
  ['postcode or Zip code', 'postcode', 'postcodeRequired'],
  ['email address', 'email', 'emailRequired'],
  ['phone number', 'phone', 'telephoneRequired']
]

const BLANK_COMMERCIAL_FORM_ERRORS = [
  'approvalNumberRequired',
  'nameRequired',
  'addressLine1Required',
  'townOrCityRequired',
  'postcodeRequired',
  'emailRequired',
  'telephoneRequired'
]

const MAX_APPROVAL_NUMBER_LENGTH = 50

const formatValidations = [
  [
    'authorisation number over 50 characters',
    'approvalNumber',
    'A'.repeat(MAX_APPROVAL_NUMBER_LENGTH + 1),
    'approvalNumberMaxLength'
  ],
  ...addressOverLengthValidations,
  ...contactOverLengthValidations
]

test.describe('adding a commercial transporter that is not on the list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the commercial branch of the add route opens the form, under the new-transporter caption, and titles the browser tab to match', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)

    await expect(page).toHaveURL(/\/transporters\/add\/commercial$/)
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(form.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.newTransporter
    )
    await expect(page).toHaveTitle(
      `${form.title} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('opens with the transporter-authorisation guidance the list states, in a banner titled "Important" headed by the guidance at level 2', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)

    const banner = page.locator('.govuk-notification-banner')
    await expect(
      banner.getByRole('heading', { level: 2, name: form.guidanceBannerTitle })
    ).toBeVisible()
    await expect(
      banner.getByRole('heading', { level: 2, name: form.guidanceTitle })
    ).toBeVisible()
    const bannerOpening = await banner
      .locator('.govuk-notification-banner__content > *')
      .first()
      .evaluate((node) => ({
        tag: node.tagName.toLowerCase(),
        text: node.textContent.trim()
      }))
    expect(bannerOpening).toEqual({ tag: 'h2', text: form.guidanceTitle })
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
    await answerTransporterType(page, COMMERCIAL)

    for (const label of Object.values(form.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByRole('heading', { name: form.contactHeading })
    ).toBeVisible()
    await expect(
      page.getByLabel(form.fields.phone)
    ).toHaveAccessibleDescription(form.telephoneHint)
  })

  test('fixes the country to Northern Ireland and does not let the trader change it', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)

    const country = page.locator('#country')
    await expect(country).toBeDisabled()
    await expect(country).toHaveValue(NORTHERN_IRELAND)
    await expect(country.locator('option')).toHaveCount(1)
    await expect(
      page.locator('input[type="hidden"][name="country"]')
    ).toHaveValue(NORTHERN_IRELAND)
  })

  test('the form goes back to the type question', async ({ page }) => {
    await answerTransporterType(page, COMMERCIAL)
    await page.locator(BACK_LINK).click()

    await expect(
      page.getByRole('heading', { name: copy.transporterAdd.title })
    ).toBeVisible()
  })

  test('ends with exactly the primary and the cancel, offering no overview return control', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)

    await expectPageEndsWithPrimaryAndCancel(
      page,
      copy.commercialTransporterDetails.cancelAndReturnToDashboard
    )
  })

  test('saves a hand-entered commercial transporter, lands on the transporter list first and checked under the named banner, and persists every value', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, COMMERCIAL)
    await fillTransporter(page)
    await saveAndContinue(page).click()

    await expectTransporterListShowsAddedBanner(
      page,
      'Lough neagh livestock ltd'
    )
    const firstRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('radio') })
      .first()
    await expect(
      firstRow.getByRole('cell', {
        name: validTransporter.approvalNumber,
        exact: true
      })
    ).toBeVisible()
    await expect(firstRow.getByRole('radio')).toBeChecked()

    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, COMMERCIAL_SLUG))
    for (const [field, value] of Object.entries(validTransporter)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
    await expect(page.locator('#country')).toHaveValue(NORTHERN_IRELAND)
  })

  test('cancelling leaves the commercial transporter already chosen still checked, adds no row and returns to the dashboard with no error', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, COMMERCIAL)
    await fillTransporter(page)
    await saveAndContinue(page).click()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    const transporterListUrl = journeyUrl(page, 'transporters')
    await page.goto(journeyUrl(page, COMMERCIAL_SLUG))
    await page.locator(approvalNumberInput).fill('Some typed approval number')
    await cancelAndReturnToDashboard(
      page,
      copy.commercialTransporterDetails.cancelAndReturnToDashboard
    ).click()

    await expect(page).toHaveURL(BASE)
    await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)

    await page.goto(transporterListUrl)
    await expect(
      page.getByRole('radio', {
        name: validTransporter.nameOrOrganisationName
      })
    ).toBeChecked()
    await expect(
      page.getByRole('cell', {
        name: 'Some typed approval number',
        exact: true
      })
    ).toHaveCount(0)
  })

  test('a transporter the trader added is on the list, checked, and saving the list again leaves it alone', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    const addedTransporter = {
      ...validTransporter,
      nameOrOrganisationName: 'Quay Road Haulage Ltd'
    }
    await answerTransporterType(page, COMMERCIAL)
    await fillTransporter(page, addedTransporter)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('radio', {
        name: addedTransporter.nameOrOrganisationName
      })
    ).toBeChecked()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, COMMERCIAL_SLUG))
    await expect(page.locator(approvalNumberInput)).toHaveValue(
      addedTransporter.approvalNumber
    )
  })

  test('saving a wholly blank commercial transporter form keeps the trader on it, naming every required field in order', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    await expect(page.locator(ERROR_SUMMARY).getByRole('link')).toHaveText(
      BLANK_COMMERCIAL_FORM_ERRORS.map((error) => form.errors[error])
    )
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
      await answerTransporterType(page, COMMERCIAL)
      await fillTransporter(page)
      await page.locator(`#${field}`).fill('')
      await saveAndContinue(page).click()

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
      await answerTransporterType(page, COMMERCIAL)
      await fillTransporter(page, { ...validTransporter, [field]: invalid })
      await saveAndContinue(page).click()

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
    await answerTransporterType(page, COMMERCIAL)

    await expectNoSeriousOrCriticalViolations(page, form.title)
  })

  test('the form in its error state has no serious or critical axe violations', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)
    await fillTransporter(page)
    await page.locator(approvalNumberInput).fill('')
    await saveAndContinue(page).click()

    await expect(page.locator(ERROR_SUMMARY)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, `${form.title} in error`)
  })
})
