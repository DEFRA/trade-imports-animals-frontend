import { expect, test } from '@playwright/test'
import {
  FORM_GROUP_ANCESTOR_XPATH,
  contentWidthOf,
  expectNoSeriousOrCriticalViolations,
  expectPageEndsWithPrimaryAlone,
  expectSubmittedSearchLook,
  journeyFormOf,
  journeyUrl,
  searchByPressingEnter,
  signIn,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { validatorDefaults } from '../../../../../../../shared/copy.en.js'
import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE,
  parties
} from '../../../../../../../services/transporters/index.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { addressSummary } from '../transporters/transporter-record.js'

const addressLine1Input = '#addressLine1'
const invalidCountry = 'Invalid country'
const PRIVATE_ADD_SLUG = 'transporters/add/private'
const REGISTER_SLUG = 'transporters/select'
const PHONE_WIDTH = 400
const PHONE_HEIGHT = 900
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

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const openTransporterList = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: copy.portOfEntry.title }).click()
  await submit(page)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.getByRole('link', { name: 'Transport details' }).click()
  await expect(
    page.getByRole('heading', { name: copy.transporters.title })
  ).toBeVisible()
}

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

const searchRowLeftHalfOf = (page) =>
  page.locator('.govuk-grid-column-one-half').first()

const addTransporterOf = (page) =>
  page.getByRole('button', { name: copy.transporters.add })

const searchTransporters = async (page, term) => {
  await searchBoxOf(page).fill(term)
  await searchButtonOf(page).click()
}

const openTransporterType = async (page) => {
  await openTransporterList(page)
  await addTransporterOf(page).click()
  await expect(
    page.getByRole('heading', { name: copy.transporterAdd.title })
  ).toBeVisible()
}

const openCommercialAdd = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporterAdd.options.Commercial.text })
    .check()
  await submit(page)
  await expect(
    page.getByRole('heading', {
      name: copy.commercialTransporterDetails.title
    })
  ).toBeVisible()
}

const openCommercialRegister = async (page) => {
  await openCommercialAdd(page)
  await page.goto(journeyUrl(page, REGISTER_SLUG))
  await expect(
    page.getByRole('heading', { name: copy.transportersSelect.title })
  ).toBeVisible()
}

const openPrivate = async (page) => {
  await openTransporterType(page)
  await page
    .getByRole('radio', { name: copy.transporterAdd.options.Private.text })
    .check()
  await submit(page)
  await expect(
    page.getByRole('heading', { name: copy.privateTransporterDetails.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY).getByRole('link', { name: message })

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

const requiredPrivateValidations = [
  ['name or organisation name', 'nameOrOrganisationName', 'nameRequired'],
  ['address line 1', 'addressLine1', 'addressLine1Required'],
  ['town or city', 'townOrCity', 'townOrCityRequired'],
  ['postcode or Zip code', 'postcode', 'postcodeRequired'],
  ['country', 'country', 'countryRequired'],
  ['phone number', 'phone', 'telephoneRequired'],
  ['email address', 'email', 'emailRequired']
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
    'postcode or Zip code over 12 characters',
    'postcode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1),
    'postcodeMaxLength'
  ],
  [
    'phone number over 20 characters',
    'phone',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1),
    'telephoneMaxLength'
  ],
  [
    'email address over 254 characters',
    'email',
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
      page.getByRole('group', { name: copy.transporters.legend })
    ).toBeVisible()
  })

  test('lists every transporter the service knows about in headed columns, each row showing its address, approval number and type', async ({
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
        record.approvalNumber ?? ''
      )
      await expect(row.getByRole('cell').nth(4)).toHaveText(
        copy.transporters.types[record.type]
      )
      await expect(row.getByRole('cell').nth(5)).toHaveText(
        copy.transporters.statuses[record.status]
      )
    }
  })

  test('tags an approved transporter green and a newly added one pink', async ({
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

  test('picking a commercial transporter saves it with its type and persists', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.getByRole('radio', { name: commercialRecord.name }).check()
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
    await page.goto(journeyUrl(page, REGISTER_SLUG))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
  })

  test('picking a private transporter saves it with its type and persists', async ({
    page
  }) => {
    await openTransporterList(page)
    await page.getByRole('radio', { name: privateRecord.name }).check()
    await submit(page)
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
    await openPrivate(page)
    await fillPrivateTransporter(page, handTypedTransporter)
    await submit(page)

    await page.goto(journeyUrl(page, 'transporters'))
    await expect(
      page.getByRole('radio', {
        name: handTypedTransporter.nameOrOrganisationName
      })
    ).toBeChecked()
    await submit(page)

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
    await tickAsUnknownTransporter(
      page.getByRole('radio', { name: commercialRecord.name })
    )
    await submit(page)

    const link = errorLink(page, copy.transporters.errors.transporterRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.locator('input[name="transporter"]').first()
    ).toBeFocused()
    await expect(page.locator('input[name="transporter"]:checked')).toHaveCount(
      0
    )
  })
})

test.describe('the transporter search box', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('is a medium-labelled box, hinted with what it matches, joined to a blue icon button, filling the left half of the search row', async ({
    page
  }) => {
    await openTransporterList(page)

    await expectSubmittedSearchLook(page, {
      search: copy.transporters.search,
      expectedWidth: await contentWidthOf(searchRowLeftHalfOf(page))
    })
  })

  test('has no serious or critical axe violations when empty', async ({
    page
  }) => {
    await openTransporterList(page)

    await expectNoSeriousOrCriticalViolations(page, 'Transporter list')
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

  test('finds a row the first term left out after a refused save', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchBoxOf(page).fill('garcia')
    await tickAsUnknownTransporter(
      page.getByRole('radio', { name: commercialRecord.name })
    )
    await submit(page)
    await expect(page.locator(ERROR_SUMMARY)).toBeVisible()

    await searchBoxOf(page).fill('aberdeen')

    await expect(
      page.getByRole('radio', { name: privateRecord.name })
    ).toBeVisible()
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
    await submit(page)
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
    await page.setViewportSize({ width: PHONE_WIDTH, height: PHONE_HEIGHT })
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
    await expectBranchOptions(page)
    await expectPageEndsWithPrimaryAlone(page)
  })

  test('heads the type question with the choice it asks for, under the new-transporter caption, and warns the trader to search first', async ({
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
      page.locator('legend').filter({ hasText: copy.transporterAdd.legend })
    ).toHaveClass(/govuk-visually-hidden/)
  })

  test('heads the private form as an addition, under the same caption', async ({
    page
  }) => {
    await openPrivate(page)

    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.privateTransporterDetails.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.newTransporter
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

  test('private branch routes to its details page and persists on back', async ({
    page
  }) => {
    await openPrivate(page)

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
    await openCommercialAdd(page)

    await expect(page).toHaveURL(/\/transporters\/add\/commercial$/)
  })

  test('a transporter added on one notification is on the list of the next one, ready to pick', async ({
    page
  }) => {
    const reusedTransporter = {
      ...handTypedTransporter,
      nameOrOrganisationName: 'Dupont Transport SARL'
    }
    await openPrivate(page)
    await fillPrivateTransporter(page, reusedTransporter)
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await openTransporterList(page)
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
    await submit(page)
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

test.describe('commercial transporter page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('commercial transporter page renders address and approval details', async ({
    page
  }) => {
    await openCommercialRegister(page)
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
    await openCommercialRegister(page)
    const selected = values.commercialTransporter
    await tickAsUnknownTransporter(
      page.getByRole('radio', { name: selected.name })
    )
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
    await openCommercialRegister(page)
    const selected = values.commercialTransporter
    await page.getByRole('radio', { name: selected.name }).check()
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, REGISTER_SLUG))
    await expect(page.getByRole('radio', { name: selected.name })).toBeChecked()
  })
})

test.describe('private transporter rendering and optionality', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
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

  test('private transporter phone number hints the international dialling code', async ({
    page
  }) => {
    await openPrivate(page)

    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.phone)
    ).toHaveAccessibleDescription(copy.privateTransporterDetails.telephoneHint)
  })

  test('private transporter page heads the contact details after the address, email first', async ({
    page
  }) => {
    await openPrivate(page)

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

  test('a completely blank private transporter record is optional', async ({
    page
  }) => {
    await openPrivate(page)
    await submit(page)

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('private transporter page ends with the primary alone, being reached from the type question', async ({
    page
  }) => {
    await openPrivate(page)

    await expectPageEndsWithPrimaryAlone(page)
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
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

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
  test.beforeEach(async ({ page }) => {
    await signIn(page)
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
      if (field === 'country') {
        await control.selectOption(value)
      } else {
        await control.fill(value)
      }
    }
    await submit(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

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

  test('transporter type page has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterType(page)
    await expectNoSeriousOrCriticalViolations(page, 'Transporter type')
  })

  test('commercial transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await openCommercialRegister(page)
    await expectNoSeriousOrCriticalViolations(page, 'Commercial transporter')
  })

  test('private transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await openPrivate(page)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Private transporter details'
    )
  })
})
