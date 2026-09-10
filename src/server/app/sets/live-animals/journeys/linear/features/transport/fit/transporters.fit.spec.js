import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  expectPageEndsWithPrimaryAlone,
  journeyUrl,
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
const BACK_LINK = '.govuk-back-link'
const ERROR_SUMMARY = '.govuk-error-summary'

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

/** The one table row a transporter owns, found by the cell under Name. Matching
 * the row's text would also match the radio's visually hidden "Select <name>"
 * label, so an empty Name column would still find the row. */
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
  await expect(
    page.getByRole('heading', { name: copy.transporters.title })
  ).toBeVisible()
}

/** Search the list the way a trader does: type a term and submit. The search
 * is a submit on the page's own form, so nothing here depends on client JS. */
const searchTransporters = async (page, term) => {
  await page
    .getByLabel(copy.transporters.search.label, { exact: true })
    .fill(term)
  await page
    .getByRole('button', { name: copy.transporters.search.button, exact: true })
    .click()
}

const openTransporterType = async (page) => {
  await openTransporterList(page)
  // The govuk button macro renders an href as a link with role="button".
  await page.getByRole('button', { name: copy.transporters.add }).click()
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

/** The approved commercial register, which nothing links to now that the add
 * route's commercial arm is the add-commercial form. Reached through that arm
 * so the transporter type is answered, which is what puts the commercial
 * answer the register writes in scope. */
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

// Not on the fixture list, so it can only have come from the add form.
const handTypedTransporter = {
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '12 Rue des Fermes',
  townOrCity: 'Amiens',
  postalOrZipCode: '80000',
  country: 'France',
  telephoneNumber: '+33 3 22 55 01 44',
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
  ['phone number', 'telephoneNumber', 'telephoneRequired'],
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
    'phone number over 20 characters',
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

// Design release 1 offers the private arm first and explains only the
// commercial one, which carries the Northern Ireland condition.
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

  // Design release 1 drops the journey-describing group hint entirely. A
  // govuk fieldset-level hint renders as a direct child of the fieldset and
  // hangs off its aria-describedby, so neither radio's own accessible
  // description would see it come back — assert it is not there at all.
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

  // Design release 1 aligns the transporters into headed columns rather than
  // running each one's facts together in a radio hint.
  test('lists every transporter the service knows about in headed columns, each row showing its address, approval number and type', async ({
    page
  }) => {
    await openTransporterList(page)

    for (const heading of Object.values(copy.transporters.table)) {
      await expect(
        page.getByRole('columnheader', { name: heading, exact: true })
      ).toHaveCount(1)
    }

    // The column order Design release 1 uses: select, Name, Address, Approval
    // number, Type, Status. Asserting by position is what pins a fact to its
    // heading — checking the row merely contains it would pass with the
    // address and the type swapped.
    for (const record of transporterRecords) {
      const row = transporterRow(page, record.name)
      await expect(row).toHaveCount(1)
      await expect(row.getByRole('radio')).toBeVisible()
      await expect(row.getByRole('cell').nth(1)).toHaveText(record.name)
      await expect(row.getByRole('cell').nth(2)).toHaveText(
        addressSummary(record.address)
      )
      // A private transporter has no approval number, so its cell stays blank.
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

  // The tag is what tells a trader at a glance that a transporter has been
  // added but not approved yet.
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
    // The pick lands on the commercial answer, so the register shows it too.
    await page.goto(journeyUrl(page, REGISTER_SLUG))
    await expect(
      page.getByRole('radio', { name: commercialRecord.name })
    ).toBeChecked()
  })

  test('picking a private transporter saves it with its type and persists — the branch the old flow had no list for', async ({
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
    // The pick lands on the private answer, address and all, so nothing has to
    // be typed in again.
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

  test('saving the list with nothing picked skips the commit and leaves a hand-typed transporter alone', async ({
    page
  }) => {
    // Through the add route, which is the only way a trader reaches the form —
    // it is the answer to the type question that puts privateTransporter in
    // scope, so a record typed without it would be purged before the save.
    await openPrivate(page)
    await fillPrivateTransporter(page, handTypedTransporter)
    await submit(page)

    await page.goto(journeyUrl(page, 'transporters'))
    // A hand-typed record is not on the list, so nothing is checked and the
    // save has no pick to commit.
    await expect(page.locator('input[name="transporter"]:checked')).toHaveCount(
      0
    )
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
    await page
      .getByRole('radio', { name: commercialRecord.name })
      .evaluate((radio) => {
        radio.value = 'invalid-transporter'
        radio.checked = true
      })
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

// Design release 1 puts a search over the list — the register is longer than a
// screenful and grows. It is a submit on the page's own form, so the filtering
// is the server's and a trader without JavaScript searches the same way.
test.describe('searching the transporter list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('carries a labelled search, hinted with what it matches, above the list', async ({
    page
  }) => {
    await openTransporterList(page)

    const search = page.getByLabel(copy.transporters.search.label, {
      exact: true
    })
    await expect(search).toBeVisible()
    await expect(page.getByText(copy.transporters.search.hint)).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: copy.transporters.search.button,
        exact: true
      })
    ).toBeVisible()

    // Above the list, not below it: a search a trader meets after the rows is
    // a search they have already scrolled past.
    const searchPrecedesTable = await page.evaluate(() => {
      const input = document.querySelector('#search')
      const table = document.querySelector('.govuk-table')
      // Neither element contains the other, so the comparison is the plain
      // "comes after" flag — DOCUMENT_POSITION_FOLLOWING, 4 — rather than a
      // mask of several. The constant is spelled out because this callback
      // runs in the browser, where the linter cannot see `Node`.
      const following = 4
      return (
        Boolean(input) &&
        Boolean(table) &&
        input.compareDocumentPosition(table) === following
      )
    })
    expect(searchPrecedesTable).toBe(true)
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
    await searchTransporters(page, privateRecord.address.postalOrZipCode)

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
    await expect(page.locator('.govuk-table')).toHaveCount(0)
  })

  test('a searched list has no serious or critical axe violations', async ({
    page
  }) => {
    await openTransporterList(page)
    await searchTransporters(page, privateRecord.name)

    await expectAxeClean(page, 'Transporter list search results')
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
    // The question still names the group for a screen reader, without
    // competing with the heading.
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

  // A private transporter is commonly based outside the UK, so design release 1
  // tells the trader to include the dialling code — the same hint the
  // commercial form carries.
  test('private transporter phone number hints the international dialling code', async ({
    page
  }) => {
    await openPrivate(page)

    await expect(
      page.getByLabel(copy.privateTransporterDetails.fields.telephoneNumber)
    ).toHaveAccessibleDescription(copy.privateTransporterDetails.telephoneHint)
  })

  // Design release 1 closes the address at the country and heads the last two
  // questions as contact details, email before phone.
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
      .locator(
        'form #country, form h2, form #emailAddress, form #telephoneNumber'
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => node.id || node.tagName.toLowerCase())
      )
    expect(orderedIds).toEqual([
      'country',
      'h2',
      'emailAddress',
      'telephoneNumber'
    ])
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
      page.getByLabel(copy.privateTransporterDetails.fields.emailAddress)
    ).toHaveValue(transporter.address.emailAddress)
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
    await expectAxeClean(page, 'Transporter list')
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
    await openCommercialRegister(page)
    await expectAxeClean(page, 'Commercial transporter')
  })

  test('private transporter page has no serious or critical axe violations', async ({
    page
  }) => {
    await openPrivate(page)
    await expectAxeClean(page, 'Private transporter details')
  })
})
