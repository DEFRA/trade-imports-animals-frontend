import { expect, test } from '@playwright/test'
import {
  BASE,
  FORM_GROUP_ANCESTOR_XPATH,
  PHONE_VIEWPORT,
  answerTransporterType,
  cancelAndReturnToDashboard,
  contentWidthOf,
  continueTransporterType,
  expectNoSeriousOrCriticalViolations,
  expectPageEndsWithPrimaryAlone,
  expectPageEndsWithPrimaryAndCancel,
  expectSearchBoxJoinedToItsButton,
  expectTransporterListShowsAddedBanner,
  journeyFormOf,
  journeyUrl,
  openNotificationView,
  openTransporterList,
  openTransporterType,
  rowFor,
  saveAndContinue,
  searchByPressingEnter,
  signIn,
  signInWithOwnTransporterStore,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as checkAnswersCopy } from '../../check-answers/copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { countriesOriginEntries } from '../../../../../../../services/_capture/fixtures.js'
import { compareLabels } from '../../../../../../../services/countries/country-labels.js'
import { UNITED_KINGDOM } from '../../../../../../../services/countries/index.js'
import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE,
  parties
} from '../../../../../../../services/transporters/index.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { config } from '../../../../../../../../../config/config.js'
import {
  addressOverLengthValidations,
  contactOverLengthValidations
} from './test-support.js'
import { addressSummary } from '../transporters/transporter-record.js'

const addressLine1Input = '#addressLine1'
const invalidCountry = 'Invalid country'
const PRIVATE_ADD_SLUG = 'transporters/add/private'
const COMMERCIAL_ADD_SLUG = 'transporters/add/commercial'
const TABLE = '.govuk-table'
const BACK_LINK = '.govuk-back-link'
const ERROR_SUMMARY = '.govuk-error-summary'
const NO_MATCH_TERM = 'no such transporter'
const INVALID_TRANSPORTER_ID = 'invalid-transporter'

const transporterRecords = parties()
const privateRecord = transporterRecords.find(
  (record) => record.type === PRIVATE
)
const commercialRecord = transporterRecords.find(
  (record) => record.type === COMMERCIAL
)
const approvedRecord = transporterRecords.find(
  (record) => record.status === APPROVED
)
const newRecord = transporterRecords.find((record) => record.status === NEW)

const transporterRow = (page, name) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name, exact: true }) })

const searchBoxOf = (page) =>
  page.getByLabel(copy.transporters.search.label, { exact: true })

const searchButtonOf = (page) =>
  page.getByRole('button', {
    name: copy.transporters.search.button,
    exact: true
  })

const tickAsUnknownTransporter = (radio) =>
  radio.evaluate((input, value) => {
    input.value = value
    input.checked = true
  }, INVALID_TRANSPORTER_ID)

const submitTransporterNotOnTheList = async (page) => {
  await tickAsUnknownTransporter(
    page.getByRole('radio', { name: commercialRecord.name })
  )
  await saveAndContinue(page).click()
  await expect(page.locator(ERROR_SUMMARY)).toBeVisible()
}

const searchRowLeftHalfOf = (page) =>
  page.locator('.govuk-grid-column-one-half').first()

const addTransporterOf = (page) =>
  page.getByRole('button', { name: copy.transporters.add })

const searchTransporters = async (page, term) => {
  await searchBoxOf(page).fill(term)
  await searchButtonOf(page).click()
}

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY).getByRole('link', { name: message })

const expectTransporterErrorLinkFocusesUncheckedFirstOption = async (page) => {
  const link = errorLink(page, copy.transporters.errors.transporterRequired)
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator('input[name="transporter"]').first()).toBeFocused()
  await expect(page.locator('input[name="transporter"]:checked')).toHaveCount(0)
}

const SOME_TYPED_TRANSPORTER_NAME = 'Some typed transporter name'

const fillsPrivateNameThenCancelsToDashboard = async (page) => {
  await expect(
    page.getByRole('heading', { name: copy.privateTransporterDetails.title })
  ).toBeVisible()
  await page
    .locator('#nameOrOrganisationName')
    .fill(SOME_TYPED_TRANSPORTER_NAME)
  await cancelAndReturnToDashboard(
    page,
    copy.privateTransporterDetails.cancelAndReturnToDashboard
  ).click()

  await expect(page).toHaveURL(BASE)
  await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)
}

const validPrivateTransporter = {
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '10 Rue de la Ferme',
  addressLine2: 'Bâtiment 2',
  townOrCity: 'Calais',
  county: 'Pas-de-Calais',
  postcode: '62100',
  country: 'France',
  phone: '+33 3 21 00 00 00',
  email: 'jean.dupont@example.fr'
}

const handTypedTransporter = {
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '12 Rue des Fermes',
  townOrCity: 'Amiens',
  postcode: '80000',
  country: 'France',
  phone: '+33 3 22 55 01 44',
  email: 'jean.dupont@example.fr'
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

const expectTamperedCountryRefusedOnTheUnitedKingdom = async (
  page,
  { tamperedValue, errorKey }
) => {
  await fillPrivateTransporter(page)
  await page.locator('#country').evaluate((select, value) => {
    select.add(new Option(value, value))
    select.value = value
  }, tamperedValue)
  await saveAndContinue(page).click()

  const link = errorLink(page, copy.privateTransporterDetails.errors[errorKey])
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator('#country')).toBeFocused()
  await expect(page.locator('#country')).toHaveValue(UNITED_KINGDOM)
  await expect(page.locator(addressLine1Input)).toHaveValue(
    validPrivateTransporter.addressLine1
  )
}

const requiredPrivateValidations = [
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postcode or Zip code', 'postcode', 'postcodeRequired'],
  ['phone number', 'phone', 'telephoneRequired'],
  ['email address', 'email', 'emailRequired']
]

const BLANK_PRIVATE_FORM_ERRORS = [
  'nameRequired',
  'addressLine1Required',
  'townOrCityRequired',
  'postcodeRequired',
  'emailRequired',
  'telephoneRequired'
]

const offeredPrivateCountries = [
  UNITED_KINGDOM,
  ...countriesOriginEntries().map(({ name }) => name)
].sort(compareLabels)

const formatPrivateValidations = [
  ...addressOverLengthValidations,
  ...contactOverLengthValidations
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

const expectTransporterTypeOptions = async (page) => {
  const options = page.getByRole('radio')
  await expect(options).toHaveCount(2)
  await expect(options.nth(0)).toHaveValue(PRIVATE)
  await expect(options.nth(1)).toHaveValue(COMMERCIAL)

  const privateOption = page.getByRole('radio', {
    name: copy.transporterAdd.options.Private.text
  })
  await expect(privateOption).toBeVisible()
  await expect(privateOption).toHaveAccessibleDescription('')

  const commercialOption = page.getByRole('radio', {
    name: copy.transporterAdd.options.Commercial.text
  })
  await expect(commercialOption).toBeVisible()
  await expect(commercialOption).toHaveAccessibleDescription(
    copy.transporterAdd.options.Commercial.hint
  )

  await expect(page.locator('fieldset > .govuk-hint')).toHaveCount(0)
}

test.describe('transporter list page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('opens the transporter task on the list, carrying the introduction and the authorisation guidance', async ({
    page
  }) => {
    await openTransporterList(page)

    await expect(page.getByText(copy.transporters.intro)).toBeVisible()
    await expectTransporterGuidance(page)
    await expect(
      page.getByRole('group', { name: copy.transporters.resultsHeading })
    ).toBeVisible()
  })

  test('names the choice once: a heading above the search and the table, with the fieldset carrying the same words for screen readers only', async ({
    page
  }) => {
    await openTransporterList(page)
    const heading = page.getByRole('heading', {
      level: 2,
      name: copy.transporters.resultsHeading
    })
    await expect(heading).toBeVisible()
    const headingBox = await heading.boundingBox()
    const searchGroupBox = await searchBoxOf(page)
      .locator(FORM_GROUP_ANCESTOR_XPATH)
      .boundingBox()
    const tableBox = await page.locator(TABLE).boundingBox()

    expect(headingBox.y).toBeLessThan(searchGroupBox.y)
    expect(headingBox.y).toBeLessThan(tableBox.y)
    await expect(
      page
        .locator('legend')
        .filter({ hasText: copy.transporters.resultsHeading })
    ).toHaveClass(/govuk-visually-hidden/)
  })

  test('lists the transporters the service ships in headed columns, each row showing its address, approval number and type', async ({
    page
  }) => {
    await openTransporterList(page)

    for (const heading of Object.values(copy.transporters.table)) {
      await expect(
        page.getByRole('columnheader', { name: heading, exact: true })
      ).toHaveCount(1)
    }

    for (const record of transporterRecords) {
      const row = transporterRow(page, record.name)
      await expect(row).toHaveCount(1)
      await expect(row.getByRole('radio')).toBeVisible()
      await expect(row.getByRole('cell').nth(1)).toHaveText(record.name)
      await expect(row.getByRole('cell').nth(2)).toHaveText(
        addressSummary(record.address)
      )
      await expect(row.getByRole('cell').nth(3)).toHaveText(
        record.approvalNumber ?? sharedCopy.notApplicable
      )
      await expect(row.getByRole('cell').nth(4)).toHaveText(
        copy.transporters.types[record.type]
      )
      await expect(row.getByRole('cell').nth(5)).toHaveText(
        copy.transporters.statuses[record.status]
      )
    }
  })

  test('every shipped row’s action cell is empty, and an added transporter’s row carries a View details link naming it', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await openTransporterList(page)

    for (const record of transporterRecords) {
      await expect(
        transporterRow(page, record.name).getByRole('link', {
          name: `${copy.transporters.viewDetails} ${record.name}`,
          exact: true
        })
      ).toHaveCount(0)
    }

    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page)
    await saveAndContinue(page).click()

    await expect(
      transporterRow(
        page,
        validPrivateTransporter.nameOrOrganisationName
      ).getByRole('link', {
        name: `${copy.transporters.viewDetails} ${validPrivateTransporter.nameOrOrganisationName}`,
        exact: true
      })
    ).toBeVisible()
  })

  test('points an added row’s View details link at that transporter’s address book page, carrying this list as the return', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page)
    await saveAndContinue(page).click()
    const listUrl = journeyUrl(page, 'transporters')

    const addedName = validPrivateTransporter.nameOrOrganisationName
    const link = transporterRow(page, addedName).getByRole('link', {
      name: `${copy.transporters.viewDetails} ${addedName}`,
      exact: true
    })

    const expectedReturnUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}${listUrl}`
    const href = await link.getAttribute('href')
    const detailsUrl = new URL(href)
    expect(detailsUrl.origin).toBe(
      new URL(config.get('tradeImportsInsFrontend.baseUrl')).origin
    )
    expect(detailsUrl.pathname).toMatch(/^\/address-book\/[^/]+$/)
    expect(detailsUrl.searchParams.get('return')).toBe(expectedReturnUrl)
  })

  test('tags an approved transporter green and a newly added one magenta', async ({
    page
  }) => {
    await openTransporterList(page)

    await expect(
      transporterRow(page, approvedRecord.name).locator('.govuk-tag--green')
    ).toHaveText(copy.transporters.statuses.Approved)
    await expect(
      transporterRow(page, newRecord.name).locator('.govuk-tag--magenta')
    ).toHaveText(copy.transporters.statuses.New)
  })

  test('does not ask the transporter type before the list', async ({
    page
  }) => {
    await openTransporterList(page)

    await expect(
      page.getByRole('heading', { name: copy.transporterAdd.title })
    ).toHaveCount(0)
  })
})

test.describe('picking a transporter on the list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('picking a commercial transporter saves it with its type and persists', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.getByRole('radio', { name: commercialRecord.name }).check()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
  })

  test('picking a private transporter saves it with its type and persists', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.getByRole('radio', { name: privateRecord.name }).check()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', { name: privateRecord.name })
    ).toBeChecked()
    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))
    await expect(
      page.getByLabel(
        copy.privateTransporterDetails.fields.nameOrOrganisationName
      )
    ).toHaveValue(privateRecord.name)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.townOrCity)
    ).toHaveValue(privateRecord.address.townOrCity)
  })

  test('a transporter the trader added is on the list, checked, and saving the list again leaves it alone', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, handTypedTransporter)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('heading', { name: copy.transporters.title })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', {
        name: handTypedTransporter.nameOrOrganisationName
      })
    ).toBeChecked()
    await saveAndContinue(page).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)

    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))
    await expect(
      page.getByLabel(
        copy.privateTransporterDetails.fields.nameOrOrganisationName
      )
    ).toHaveValue(handTypedTransporter.nameOrOrganisationName)
  })

  test('transporter validation: out-of-list value links to and focuses the cleared group', async ({
    page
  }) => {
    await openTransporterList(page)
    await submitTransporterNotOnTheList(page)

    await expectTransporterErrorLinkFocusesUncheckedFirstOption(page)
  })

  test('transporter validation: continuing with nothing chosen shows the message in the summary and inline, and the summary link focuses the first option', async ({
    page
  }) => {
    await openTransporterList(page)
    await saveAndContinue(page).click()

    await expect(
      page
        .locator('.govuk-error-message')
        .filter({ hasText: copy.transporters.errors.transporterRequired })
    ).toBeVisible()
    await expectTransporterErrorLinkFocusesUncheckedFirstOption(page)
  })
})

test.describe('a View details link opened with change context', () => {
  test('keeps the change context on the return it carries', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page)
    await saveAndContinue(page).click()

    const listUrlWithChangeContext = `${journeyUrl(page, 'transporters')}?change=1`
    await page.goto(listUrlWithChangeContext)

    const addedName = validPrivateTransporter.nameOrOrganisationName
    const link = transporterRow(page, addedName).getByRole('link', {
      name: `${copy.transporters.viewDetails} ${addedName}`,
      exact: true
    })
    const href = await link.getAttribute('href')

    expect(new URL(href).searchParams.get('return')).toBe(
      `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}${listUrlWithChangeContext}`
    )
  })
})

test.describe('the transporter search box', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('is a box hinted with what it matches, joined flush to its one search button, filling the left half of the search row', async ({
    page
  }) => {
    await openTransporterList(page)

    await expectSearchBoxJoinedToItsButton(page, {
      search: copy.transporters.search,
      expectedWidth: await contentWidthOf(searchRowLeftHalfOf(page))
    })
  })
})

test.describe('filtering the transporter list as the trader types', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('narrows the rows with no new page, keeps focus in the box and bolds the matching letters', async ({
    page
  }) => {
    await openTransporterList(page)
    const listUrl = page.url()
    await page.evaluate(() => {
      window.documentMarker = 'same document'
    })
    const searchBox = searchBoxOf(page)

    await searchBox.click()
    await searchBox.pressSequentially('garcia')

    await expect(
      page.getByRole('row').filter({ has: page.getByRole('radio') })
    ).toHaveCount(1)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(1)
    await expect(
      transporterRow(page, commercialRecord.name).locator(
        '.govuk-\\!-font-weight-bold'
      )
    ).toHaveText('García')
    await expect(searchBox).toBeFocused()
    expect(page.url()).toBe(listUrl)
    expect(await page.evaluate(() => window.documentMarker)).toBe(
      'same document'
    )
  })

  test('a filtered list has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterList(page)

    await searchBoxOf(page).fill(privateRecord.name)

    await expectNoSeriousOrCriticalViolations(page, 'Filtered transporter list')
  })

  test('announces how many transporters are shown', async ({ page }) => {
    await openTransporterList(page)

    await searchBoxOf(page).fill(privateRecord.name)

    await expect(page.getByRole('status')).toHaveText(
      copy.transporters.shownCount(1)
    )
  })

  test('narrows to a status when its word is typed', async ({ page }) => {
    await openTransporterList(page)

    await searchBoxOf(page).fill(copy.transporters.statuses[NEW])

    await expect(transporterRow(page, newRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, approvedRecord.name)).toHaveCount(0)
  })

  test('shows a row hidden by the previous term when a different term is typed after the search button is pressed', async ({
    page
  }) => {
    await openTransporterList(page)
    const urlBefore = page.url()
    const searchBox = searchBoxOf(page)
    await searchBox.fill(commercialRecord.name)
    await searchButtonOf(page).click()
    expect(page.url()).toBe(urlBefore)

    await searchBox.fill(privateRecord.name)

    await expect(transporterRow(page, privateRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(0)
  })

  test('keeps the list narrowed to the term typed before a refused save', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchBoxOf(page).fill('garcia')
    await submitTransporterNotOnTheList(page)

    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: privateRecord.name })
    ).toHaveCount(0)
  })

  test('says so and hides the table when nothing matches', async ({ page }) => {
    await openTransporterList(page)

    await searchBoxOf(page).fill(NO_MATCH_TERM)

    await expect(
      page.getByText(copy.transporters.noMatches).first()
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(
      copy.transporters.noMatches
    )
    await expect(page.locator(TABLE)).toBeHidden()
  })

  test('a list with no matches has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterList(page)

    await searchBoxOf(page).fill(NO_MATCH_TERM)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Transporter list, no match'
    )
  })

  test('saves the transporter ticked before the list was filtered to hide it', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.getByRole('radio', { name: commercialRecord.name }).check()

    await searchBoxOf(page).fill(privateRecord.name)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(0)
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
  })
})

test.describe('searching the transporter list without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('narrows the list on the server when Enter is pressed in the box', async ({
    page
  }) => {
    await openTransporterList(page)

    await searchByPressingEnter(page, {
      search: copy.transporters.search,
      term: privateRecord.name
    })

    await expect(transporterRow(page, privateRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(0)
  })

  test('searching by name leaves only the matching transporter on the list', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, privateRecord.name)

    await expect(transporterRow(page, privateRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(0)
  })

  test('searching by approval number finds the transporter it belongs to', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, commercialRecord.approvalNumber)

    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, privateRecord.name)).toHaveCount(0)
  })

  test('searching by address finds the transporter at it', async ({ page }) => {
    await openTransporterList(page)
    await searchTransporters(page, privateRecord.address.postcode)

    await expect(transporterRow(page, privateRecord.name)).toHaveCount(1)
    await expect(transporterRow(page, commercialRecord.name)).toHaveCount(0)
  })

  test('keeps the term in the box and stays on the list, saving nothing', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, privateRecord.name)

    await expect(
      page.getByLabel(copy.transporters.search.label, { exact: true })
    ).toHaveValue(privateRecord.name)
    await expect(
      page.getByRole('heading', { name: copy.transporters.title })
    ).toBeVisible()
    await expect(page.locator(ERROR_SUMMARY)).toHaveCount(0)
  })

  test('says so when nothing matches, rather than showing an empty table', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, 'no such transporter')

    await expect(page.getByText(copy.transporters.noMatches)).toBeVisible()
    await expect(page.locator(TABLE)).toBeHidden()
  })

  test('picks a transporter found by the search and saves it, landing on the overview with that transporter chosen', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, commercialRecord.name)
    await page.getByRole('radio', { name: commercialRecord.name }).check()
    await saveAndContinue(page).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
  })
})

test.describe('Add a transporter beside the search', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('comes before the table and shares the search row, right-aligned', async ({
    page
  }) => {
    await openTransporterList(page)
    const searchGroup = searchBoxOf(page).locator(FORM_GROUP_ANCESTOR_XPATH)
    const addBox = await addTransporterOf(page).boundingBox()
    const searchGroupBox = await searchGroup.boundingBox()
    const tableBox = await page.locator(TABLE).boundingBox()
    const formBox = await journeyFormOf(page).boundingBox()

    expect(addBox.y).toBeGreaterThanOrEqual(searchGroupBox.y)
    expect(addBox.y).toBeLessThan(searchGroupBox.y + searchGroupBox.height)
    expect(addBox.y + addBox.height).toBeLessThan(tableBox.y)
    expect(addBox.x + addBox.width).toBeCloseTo(formBox.x + formBox.width, 0)
  })

  test('sits below the search box on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
    await openTransporterList(page)
    const searchGroupBox = await searchBoxOf(page)
      .locator(FORM_GROUP_ANCESTOR_XPATH)
      .boundingBox()
    const addBox = await addTransporterOf(page).boundingBox()

    expect(addBox.y).toBeGreaterThanOrEqual(
      searchGroupBox.y + searchGroupBox.height
    )
  })

  test('is reached by Tab after the search box and its button, before the first transporter', async ({
    page
  }) => {
    await openTransporterList(page)

    await searchBoxOf(page).focus()
    await page.keyboard.press('Tab')
    await expect(searchButtonOf(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(addTransporterOf(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio').first()).toBeFocused()
  })
})

test.describe('adding a transporter that is not on the list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('reaches the type question from the list, not before it', async ({
    page
  }) => {
    await openTransporterType(page)

    await expect(page).toHaveURL(/\/transporters\/add$/)
    await expectTransporterTypeOptions(page)
    await expectPageEndsWithPrimaryAlone(
      page,
      copy.transporterAdd.continueButton
    )
  })

  test('heads the type question with the choice it asks for, under the new-transporter caption, and warns the trader to check the list for duplicates', async ({
    page
  }) => {
    await openTransporterType(page)

    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.transporterAdd.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.newTransporter
    )
    await expect(page.getByText(copy.transporterAdd.warning)).toBeVisible()
    await expect(
      page.locator('legend').filter({ hasText: copy.transporterAdd.title })
    ).toHaveClass(/govuk-visually-hidden/)
  })

  test('heads the private form as an addition, titles the browser tab to match, under the same caption', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.privateTransporterDetails.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.newTransporter
    )
    await expect(page).toHaveTitle(
      `${copy.privateTransporterDetails.title} - Import notification service - GOV.UK`
    )
  })

  test('the type question goes back to the list', async ({ page }) => {
    await openTransporterType(page)
    await page.locator(BACK_LINK).click()

    await expect(
      page.getByRole('heading', { name: copy.transporters.title })
    ).toBeVisible()
  })

  test('the add route keeps the change context on its back link', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.goto(`${journeyUrl(page, 'transporters')}?change=1`)
    await page.getByRole('button', { name: copy.transporters.add }).click()

    await expect(page).toHaveURL(/\/transporters\/add\?change=1$/)
    await expect(page.locator(BACK_LINK)).toHaveAttribute(
      'href',
      /\/transporters\?change=1$/
    )
  })

  test('opening the private form before a type is chosen lands on the type question', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))

    await expect(
      page.getByRole('heading', { name: copy.transporterAdd.title })
    ).toBeVisible()
  })

  test('opening the commercial form with the private type chosen lands on the type question', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await page.goto(journeyUrl(page, COMMERCIAL_ADD_SLUG))

    await expect(
      page.getByRole('heading', { name: copy.transporterAdd.title })
    ).toBeVisible()
  })

  test('transporter type validation: out-of-list value links to and focuses the cleared group', async ({
    page
  }) => {
    await openTransporterType(page)
    await page
      .getByRole('radio', { name: copy.transporterAdd.options.Commercial.text })
      .evaluate((radio) => {
        radio.value = 'Invalid transporter type'
        radio.checked = true
      })
    await continueTransporterType(page).click()

    const link = errorLink(
      page,
      copy.transporterAdd.errors.transporterTypeRequired
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="transporterType"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="transporterType"]:checked')
    ).toHaveCount(0)
  })

  test('transporter type validation: continuing with nothing chosen shows the message in the summary and inline, and the summary link focuses the first option', async ({
    page
  }) => {
    await openTransporterType(page)
    await continueTransporterType(page).click()

    const link = errorLink(
      page,
      copy.transporterAdd.errors.transporterTypeRequired
    )
    await expect(link).toBeVisible()
    await expect(
      page
        .locator('.govuk-error-message')
        .filter({ hasText: copy.transporterAdd.errors.transporterTypeRequired })
    ).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="transporterType"]').first()
    ).toBeFocused()
  })

  test('private branch routes to its details page and persists on back', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(page).toHaveURL(/\/transporters\/add\/private$/)
    await page.locator(BACK_LINK).click()
    await expect(
      page.getByRole('radio', {
        name: copy.transporterAdd.options.Private.text
      })
    ).toBeChecked()
  })

  test('commercial branch routes to the add-commercial form', async ({
    page
  }) => {
    await answerTransporterType(page, COMMERCIAL)

    await expect(page).toHaveURL(/\/transporters\/add\/commercial$/)
  })

  test('a transporter added on one notification is on the list of the next one, ready to pick', async ({
    page
  }, testInfo) => {
    const reusedTransporter = {
      ...handTypedTransporter,
      nameOrOrganisationName: `Dupont Transport SARL ${testInfo.retry}`
    }
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, reusedTransporter)
    await saveAndContinue(page).click()

    const row = transporterRow(page, reusedTransporter.nameOrOrganisationName)
    await expect(row).toHaveCount(1)
    await expect(row.getByRole('cell').nth(2)).toHaveText(
      addressSummary({
        addressLine1: reusedTransporter.addressLine1,
        townOrCity: reusedTransporter.townOrCity,
        postcode: reusedTransporter.postcode,
        country: reusedTransporter.country
      })
    )
    await expect(row.getByRole('cell').nth(4)).toHaveText(
      copy.transporters.types[PRIVATE]
    )
    await expect(row.getByRole('cell').nth(5)).toHaveText(
      copy.transporters.statuses[NEW]
    )

    await row.getByRole('radio').check()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))
    await expect(
      page.getByLabel(
        copy.privateTransporterDetails.fields.nameOrOrganisationName
      )
    ).toHaveValue(reusedTransporter.nameOrOrganisationName)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.townOrCity)
    ).toHaveValue(reusedTransporter.townOrCity)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.email)
    ).toHaveValue(reusedTransporter.email)
  })
})

test.describe('private transporter rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('private transporter page opens on the name or organisation name field, directly under its heading, and labels every field', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(page.locator('h1 + form')).toBeVisible()
    await expect(
      page.locator('h1 + form :is(input:not([type="hidden"]), select)').first()
    ).toHaveAttribute('id', 'nameOrOrganisationName')
    for (const label of Object.values(copy.privateTransporterDetails.fields)) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
  })

  test('private transporter country select opens on the United Kingdom and offers every country in alphabetical order', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(page.locator('#country option')).toHaveText(
      offeredPrivateCountries
    )
    await expect(page.locator('#country')).toHaveValue(UNITED_KINGDOM)
  })

  test('private transporter phone number hints the international dialling code', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.phone)
    ).toHaveAccessibleDescription(copy.privateTransporterDetails.telephoneHint)
  })

  test('private transporter page heads the contact details after the address, email first', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expect(
      page.getByRole('heading', {
        name: copy.privateTransporterDetails.contactHeading
      })
    ).toBeVisible()
    const orderedIds = await page
      .locator('form #country, form h2, form #email, form #phone')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.id || node.tagName.toLowerCase())
      )
    expect(orderedIds).toEqual(['country', 'h2', 'email', 'phone'])
  })

  test('saving a wholly blank private transporter form keeps the trader on it, naming every required field in order', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    await expect(page.locator(ERROR_SUMMARY).getByRole('link')).toHaveText(
      BLANK_PRIVATE_FORM_ERRORS.map(
        (error) => copy.privateTransporterDetails.errors[error]
      )
    )
  })

  test('private transporter page ends with exactly the primary and the cancel, offering no overview return control', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)

    await expectPageEndsWithPrimaryAndCancel(
      page,
      copy.privateTransporterDetails.cancelAndReturnToDashboard
    )
  })
})

test.describe('private transporter required validations', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const [name, field, error] of requiredPrivateValidations) {
    test(`private transporter validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await answerTransporterType(page, PRIVATE)
      await fillPrivateTransporter(page)
      await page.locator(`#${field}`).fill('')
      await saveAndContinue(page).click()

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
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const [name, field, invalid, error] of formatPrivateValidations) {
    test(`private transporter validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await answerTransporterType(page, PRIVATE)
      await fillPrivateTransporter(page, {
        ...validPrivateTransporter,
        [field]: invalid
      })
      await saveAndContinue(page).click()

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

  test('private transporter validation: out-of-list country is refused, focuses the select reopened on the United Kingdom, and preserves other values', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await expectTamperedCountryRefusedOnTheUnitedKingdom(page, {
      tamperedValue: invalidCountry,
      errorKey: 'countryFromList'
    })
  })

  test('private transporter validation: a blank country tampered onto the select is refused and reopens on the United Kingdom', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await expectTamperedCountryRefusedOnTheUnitedKingdom(page, {
      tamperedValue: '',
      errorKey: 'countryRequired'
    })
  })
})

test.describe('private transporter persistence', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves and persists a complete private transporter record', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
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
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: copy.transporters.title })
    ).toBeVisible()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await openNotificationView(page)
    await expect(
      rowFor(page, checkAnswersCopy.rows.country).getByRole('definition')
    ).toHaveText(transporter.address.country)

    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))
    await expect(
      page.getByLabel(
        copy.privateTransporterDetails.fields.nameOrOrganisationName
      )
    ).toHaveValue(transporter.name)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.country)
    ).toHaveValue(transporter.address.country)
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.email)
    ).toHaveValue(transporter.address.email)
  })
})

test.describe('saving an added transporter', () => {
  test('lands on the transporter list with the new transporter first and checked, under the named success banner', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, handTypedTransporter)
    await saveAndContinue(page).click()

    await expectTransporterListShowsAddedBanner(page, 'Jean dupont')
    const firstRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('radio') })
      .first()
    await expect(
      firstRow.getByRole('cell', {
        name: handTypedTransporter.nameOrOrganisationName,
        exact: true
      })
    ).toBeVisible()
    await expect(firstRow.getByRole('radio')).toBeChecked()
  })

  test('reloading the list afterwards shows the same rows with no banner', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, handTypedTransporter)
    await saveAndContinue(page).click()

    await page.reload()

    await expect(
      page.getByText(copy.transporters.addedBanner.title)
    ).toHaveCount(0)
    await expect(
      page.getByRole('radio', {
        name: handTypedTransporter.nameOrOrganisationName
      })
    ).toBeChecked()
  })
})

test.describe('cancelling an add form', () => {
  test('keeping the stored type: leaves the chosen transporter alone and returns to the dashboard with no error', async ({
    page
  }) => {
    await signInWithOwnTransporterStore(page)
    await openTransporterList(page)
    await page.getByRole('radio', { name: privateRecord.name }).check()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    const transporterListUrl = journeyUrl(page, 'transporters')
    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))
    await fillsPrivateNameThenCancelsToDashboard(page)

    await page.goto(transporterListUrl)
    await expect(
      page.getByRole('radio', { name: privateRecord.name })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', {
        name: SOME_TYPED_TRANSPORTER_NAME,
        exact: true
      })
    ).toHaveCount(0)
  })

  test('changing the type on the way in and cancelling leaves the previously chosen transporter selected and the transport task complete', async ({
    page
  }) => {
    const transportTaskRow = () =>
      page.getByRole('listitem').filter({
        has: page.getByText(hubCopy.rows.transporter.title, { exact: true })
      })

    await signInWithOwnTransporterStore(page)
    await openTransporterList(page)
    await page.getByRole('radio', { name: commercialRecord.name }).check()
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(transportTaskRow()).toContainText(hubCopy.statuses.complete)

    const transporterListUrl = journeyUrl(page, 'transporters')
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, 'transporters/add'))
    await page
      .getByRole('radio', { name: copy.transporterAdd.options.Private.text })
      .check()
    await continueTransporterType(page).click()
    await fillsPrivateNameThenCancelsToDashboard(page)

    await page.goto(transporterListUrl)
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', {
        name: SOME_TYPED_TRANSPORTER_NAME,
        exact: true
      })
    ).toHaveCount(0)

    await page.goto(hubUrl)
    await expect(transportTaskRow()).toContainText(hubCopy.statuses.complete)
  })
})

test.describe('a refused private add form remembers what was entered', () => {
  test('shows the entered values again when the trader leaves and comes back', async ({
    page
  }) => {
    await signIn(page)
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, {
      ...validPrivateTransporter,
      email: ''
    })
    await saveAndContinue(page).click()
    await expect(page.locator(ERROR_SUMMARY)).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters'))
    await page.goto(journeyUrl(page, PRIVATE_ADD_SLUG))

    await expect(page.locator(addressLine1Input)).toHaveValue(
      validPrivateTransporter.addressLine1
    )
    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.email)
    ).toHaveValue('')
  })
})

test.describe('saving and cancelling the private form without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signInWithOwnTransporterStore(page)
  })

  test('a complete save lands on the transporter list under the named banner', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await fillPrivateTransporter(page, handTypedTransporter)
    await saveAndContinue(page).click()

    await expectTransporterListShowsAddedBanner(page, 'Jean dupont')
  })

  test('cancel takes the trader to the dashboard', async ({ page }) => {
    await answerTransporterType(page, PRIVATE)
    await page
      .locator('#nameOrOrganisationName')
      .fill(SOME_TYPED_TRANSPORTER_NAME)
    await cancelAndReturnToDashboard(
      page,
      copy.privateTransporterDetails.cancelAndReturnToDashboard
    ).click()

    await expect(page).toHaveURL(BASE)
  })
})

test.describe('transporter pages accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('transporter list page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterList(page)
    await expectNoSeriousOrCriticalViolations(page, 'Transporter list')
  })

  test('transporter list page has no serious or critical axe violations with a refused pick', async ({
    page
  }) => {
    await openTransporterList(page)
    await submitTransporterNotOnTheList(page)

    await expectNoSeriousOrCriticalViolations(page, 'Transporter list, error')
  })

  test('transporter type page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterType(page)
    await expectNoSeriousOrCriticalViolations(page, 'Transporter type')
  })

  test('private transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await answerTransporterType(page, PRIVATE)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Private transporter details'
    )
  })
})
