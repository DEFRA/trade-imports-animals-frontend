import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const PASSPORT_FIELD = '#animalIdentifierPassport-0'
const MICROCHIP_FIELD = '#animalIdentifierMicrochip-0'
const EAR_TAG_FIELD = '#animalIdentifierEarTag-0'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const EQUUS_CABALLUS = 'Equus caballus'
const CANIS_LUPUS_FAMILIARIS = 'Canis lupus familiaris'
const SALMO_SALAR = 'Salmo salar'
const DOMESTIC_CATTLE = 'Domestic cattle'
const PASSPORT_NUMBER = 'UK123456789'
const MICROCHIP_NUMBER = '900123456789012'
const MAX_LINE_LENGTH = 255
const MAX_TOWN_OR_COUNTY_LENGTH = 100
const MAX_POSTAL_OR_ZIP_CODE_LENGTH = 12
const MAX_TELEPHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254
const MAX_IDENTIFIER_LENGTH = 58
const EMAIL_DOMAIN = '@example.com'
const DEFAULT_ANIMALS_COUNT = '1'

// One commodity line per species selected, in selection order.
const lineIndicesOf = (selections) => [
  ...Array(
    selections.reduce((total, [, species]) => total + species.length, 0)
  ).keys()
]

const addLines = async (page, selections, counts = []) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  for (const [, species] of selections) {
    await selectSpecies(page, species)
  }
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  // Every line's animal count is save-blocking, so a line the caller said
  // nothing about still gets one.
  for (const index of lineIndicesOf(selections)) {
    await page
      .locator(`#numberOfAnimalsQuantity-${index}`)
      .fill(counts[index] ?? DEFAULT_ANIMALS_COUNT)
  }
}

const openIdentification = async (page, selections, counts = []) => {
  await addLines(page, selections, counts)
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page
    .getByRole('link', { name: hubCopy.rows.animalIdentification.title })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Identification details', exact: true })
  ).toBeVisible()
}

const openCatIdentification = (page) =>
  openIdentification(page, [['Cat', [FELIS_CATUS]]], ['2'])

const entryLabelsOf = (fields) =>
  fields.map((field) => copy.identification.typeFields[field].label)

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const expectErrorFocus = async (page, message, selector) => {
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator(selector)).toBeFocused()
}

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

const validPermanentAddress = {
  nameOrOrganisationName: 'Pet Owner',
  addressLine1: '1 Farm Lane',
  addressLine2: 'Apartment 2',
  townOrCity: 'Skipton',
  county: 'North Yorkshire',
  postalOrZipCode: 'BD23 1UD',
  telephoneNumber: '+44 1756 555 0192',
  emailAddress: 'owner@example.co.uk'
}

const fillAddress = async (page, address = validPermanentAddress) => {
  for (const [field, value] of Object.entries(address)) {
    await page.locator(`#${field}-0`).fill(value)
  }
}

const fillCatRecord = async (page, address = validPermanentAddress) => {
  await page.locator(MICROCHIP_FIELD).fill(MICROCHIP_NUMBER)
  await page.locator(PASSPORT_FIELD).fill(PASSPORT_NUMBER)
  await fillAddress(page, address)
}

const submitAdd = (page) =>
  page
    .getByRole('button', { name: copy.identification.saveAndAddAnother })
    .click()

// The same in-card button on the last animal the line still owes, where it
// stops inviting another record and finishes the line instead.
const submitFinish = (page) =>
  page.getByRole('button', { name: copy.identification.saveAndFinish }).click()

const inCardSaveButton = (page, name) =>
  page.getByRole('button', { name, exact: true })

// The page ends on the same primary as every other journey page — the shared
// "Save and continue", not a wording of its own.
const saveAndContinue = (page) =>
  page.getByRole('button', { name: SAVE_AND_CONTINUE, exact: true }).click()

// A saved animal is one row of the card's table, keyed by its species and
// number — "Bos taurus 1".
const savedAnimalRow = (page, species, number) =>
  page
    .getByRole('row')
    .filter({ hasText: copy.identification.animalRowNamed(species, number) })

const columnHeader = (page, name) =>
  page.getByRole('columnheader', { name, exact: true })

// The Selected commodities summary is named by its table caption.
const selectedCommoditiesSummary = (page) =>
  page.getByRole('table', { name: copy.identification.summary.caption })

const expectSummaryRow = async (summary, commonName, code, animals) => {
  const row = summary.getByRole('row').filter({ hasText: commonName })
  for (const cell of [code, commonName, animals]) {
    await expect(
      row.getByRole('cell', { name: cell, exact: true })
    ).toBeVisible()
  }
}

const removeAnimalRow = async (page, species, number) => {
  const row = savedAnimalRow(page, species, number)
  await row.getByRole('button', { name: copy.identification.removeRow }).click()
  return row
}

const addCowRecord = async (page, earTag, { last = false } = {}) => {
  await page.locator(EAR_TAG_FIELD).fill(earTag)
  await (last ? submitFinish(page) : submitAdd(page))
}

const addCatRecordRow = async (page) => {
  await openCatIdentification(page)
  await fillCatRecord(page)
  await submitAdd(page)
  return savedAnimalRow(page, FELIS_CATUS, 1)
}

const submitStaleAdd = (page) =>
  page.evaluate(() => {
    const form = document.querySelector('form')
    const action = document.createElement('input')
    action.type = 'hidden'
    action.name = 'action'
    action.value = 'add:0'
    form.appendChild(action)
    form.submit()
  })

const identifierValidations = [
  ['Cat', FELIS_CATUS, 'animalIdentifierMicrochip', 'Microchip'],
  ['Cat', FELIS_CATUS, 'animalIdentifierTattoo', 'Tattoo'],
  ['Cow', BOS_TAURUS, 'animalIdentifierPassport', 'Passport'],
  ['Cow', BOS_TAURUS, 'animalIdentifierEarTag', 'Ear tag'],
  ['Horse', EQUUS_CABALLUS, 'horseName', 'Horse name']
]

const requiredAddressValidations = [
  ['name or organisation name', 'nameOrOrganisationName'],
  ['address line 1', 'addressLine1'],
  ['town or city', 'townOrCity'],
  ['postcode or Zip code', 'postalOrZipCode'],
  ['phone number', 'telephoneNumber'],
  ['email address', 'emailAddress']
]

const addressFormatValidations = [
  [
    'name or organisation name over 255 characters',
    'nameOrOrganisationName',
    'N'.repeat(MAX_LINE_LENGTH + 1)
  ],
  [
    'address line 1 over 255 characters',
    'addressLine1',
    'A'.repeat(MAX_LINE_LENGTH + 1)
  ],
  [
    'address line 2 over 255 characters',
    'addressLine2',
    'B'.repeat(MAX_LINE_LENGTH + 1)
  ],
  [
    'town or city over 100 characters',
    'townOrCity',
    'T'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1)
  ],
  [
    'county over 100 characters',
    'county',
    'C'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1)
  ],
  [
    'postcode or Zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1)
  ],
  [
    'phone number over 20 characters',
    'telephoneNumber',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1)
  ],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(MAX_EMAIL_LENGTH + 1 - EMAIL_DOMAIN.length)}${EMAIL_DOMAIN}`
  ]
]

test.describe('animal identification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the identifier fields that apply to each commodity', async ({
    page
  }) => {
    await openIdentification(page, [
      ['Cow', [BOS_TAURUS]],
      ['Horse', [EQUUS_CABALLUS]],
      ['Fish', [SALMO_SALAR]]
    ])

    await expect(page.getByText(copy.identification.inset)).toBeVisible()
    await expect(page.locator(PASSPORT_FIELD)).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toBeVisible()
    // Design release 1 puts the tattoo on the cat, dog and ferret code and
    // not on cattle, so a cow is asked for its ear tag and its passport and
    // nothing else.
    await expect(page.locator('#animalIdentifierTattoo-0')).toHaveCount(0)
    await expect(page.locator('#animalIdentifierMicrochip-1')).toBeVisible()
    await expect(page.locator('#horseName-1')).toBeVisible()
    await expect(page.locator(MICROCHIP_FIELD)).toHaveCount(0)
    await expect(page.locator('#animalIdentifierMicrochip-2')).toHaveCount(0)
    // Fish carries no identifier of its own, so its line earns no panel —
    // design release 1 offers no free-text box to fall back on.
    await expect(page.locator('#identification-card-2')).toHaveCount(0)
    await expect(page.locator('#nameOrOrganisationName-0')).toHaveCount(0)
  })

  // Design release 1 asks for each commodity's identifiers in the order that
  // commodity's own list gives. A cow carries an ear tag, so the ear tag is
  // the box it is asked for first — and a horse, which carries a chip, is
  // asked for its microchip first. This pins the rendered order per
  // commodity; that the order is a property of the COMMODITY rather than one
  // global sequence is pinned by #identifiersFor in
  // services/commodities/index.test.js.
  test('asks a cattle line for its ear tag before its passport, and a horse for its microchip first', async ({
    page
  }) => {
    await openIdentification(page, [
      ['Cow', [BOS_TAURUS]],
      ['Horse', [EQUUS_CABALLUS]]
    ])

    await expect(page.locator('label[for$="-0"]')).toHaveText(
      entryLabelsOf(['animalIdentifierEarTag', 'animalIdentifierPassport'])
    )
    await expect(page.locator('label[for$="-1"]')).toHaveText(
      entryLabelsOf([
        'animalIdentifierMicrochip',
        'animalIdentifierPassport',
        'horseName'
      ])
    )
  })

  // Design release 1 names an identifier once and uses that name both on the
  // entry field and as the column heading of the saved-animals table. A trader
  // who types under "Passport number" and reads the value back under
  // "Passport" is being shown two names for one thing, so the entry label is
  // pinned to the column label rather than to a wording of its own.
  // Cattle only: microchip's entry label still reads 'Microchip number', a
  // wording Design release 1 has not settled here.
  test('labels the passport and ear tag fields on a cattle line with the words the saved-animals table heads them with', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]])

    for (const field of [
      'animalIdentifierPassport',
      'animalIdentifierEarTag'
    ]) {
      await expect(page.locator(`label[for="${field}-0"]`)).toHaveText(
        copy.identification.identifierLabels[field]
      )
    }
  })

  test('permanent address asks for eight fields and never for a country', async ({
    page
  }) => {
    await openCatIdentification(page)

    for (const field of Object.keys(validPermanentAddress)) {
      await expect(page.locator(`#${field}-0`)).toBeVisible()
    }
    await expect(page.locator('#country-0')).toHaveCount(0)
    await expect(page.locator('select')).toHaveCount(0)
  })

  // Design release 1 asks for the postcode and the phone number in these
  // words, and tells a trader abroad to include the country code — without
  // that hint the number they give may not be diallable from here.
  test('permanent address names the postcode and phone fields as Design release 1 does', async ({
    page
  }) => {
    await openCatIdentification(page)

    await expect(
      page.getByLabel(copy.identification.address.postalOrZipCode, {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.identification.address.telephoneNumber, {
        exact: true
      })
    ).toHaveAccessibleDescription(
      copy.identification.addressHints.telephoneNumber
    )
  })

  // Asking for the address without saying why leaves an invented one looking
  // harmless. The warning names the offence, and the second bullet names the
  // body that will turn up at whatever address was given.
  test('permanent address warns that a false address is fraud and says APHA can check it', async ({
    page
  }) => {
    await openCatIdentification(page)

    const guidance = copy.identification.permanentAddress
    await expect(page.getByText(guidance.warning)).toBeVisible()
    await expect(page.getByText(guidance.definitionLeadIn)).toBeVisible()
    for (const item of guidance.definitionItems) {
      await expect(
        page.getByRole('listitem').filter({ hasText: item })
      ).toBeVisible()
    }
    await expect(
      page.getByRole('heading', { name: guidance.question })
    ).toBeVisible()
  })

  // Design release 1 ends this page the way it ends every other page of the
  // journey. The page's own primary keeps the shared wording whatever the cards
  // are doing — the in-card button is a separate control and may read "Save and
  // finish" on the last outstanding animal, so the ban is scoped to the page's
  // save actions rather than the whole page.
  test('ends on the same Save and continue as every other journey page', async ({
    page
  }) => {
    await openCatIdentification(page)

    const saveActions = page.locator('.govuk-button-group')
    await expect(
      saveActions.getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
    ).toBeVisible()
    await expect(
      saveActions.getByRole('button', { name: 'Save and finish' })
    ).toHaveCount(0)
  })

  test('back link returns to the overview', async ({ page }) => {
    await openCatIdentification(page)
    await page.locator('.govuk-back-link').click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  // A trader who miscounts has to reach the count from the card that told
  // them it was wrong — the count itself lives on consignment details.
  test('offers Change number of animals on every card and lands on the consignment details page', async ({
    page
  }) => {
    await openIdentification(
      page,
      [
        ['Cow', [BOS_TAURUS]],
        ['Horse', [EQUUS_CABALLUS]]
      ],
      ['2', '3']
    )
    const changeCount = page.getByRole('link', {
      name: copy.identification.changeAnimalCount
    })
    await expect(changeCount).toHaveCount(2)

    await changeCount.first().click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('2')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]])
    await expectAxeClean(page, 'Animal identification')
  })

  test('has no serious or critical axe violations with the microchip field rendered', async ({
    page
  }) => {
    await openCatIdentification(page)
    await expect(page.locator(MICROCHIP_FIELD)).toBeVisible()
    await expectAxeClean(page, 'Animal identification with a microchip field')
  })

  // Design release 1 asks for identification only where the commodity has an
  // identifier of its own. A consignment holding nothing but ornamental fish
  // has nothing to identify, so the page does not exist for that person: a
  // request for it carries them on rather than showing an empty surface.
  test('carries a consignment with nothing to identify past the page', async ({
    page
  }) => {
    await addLines(page, [['Fish', [SALMO_SALAR]]], ['3'])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page
      .getByRole('link', { name: hubCopy.rows.animalIdentification.title })
      .click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Identification details', exact: true })
    ).toHaveCount(0)
  })
})

// Design release 1 makes the in-card button name what is left on the line, so
// the words tell the trader what pressing them does next.
test.describe('animal identification in-card save button', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('invites another record while more than one animal is outstanding, then finishes the line on the last', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toBeVisible()

    await addCowRecord(page, 'UK000000000001')

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 2, 2)
      })
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndFinish)
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toHaveCount(0)

    await addCowRecord(page, 'UK000000000002', { last: true })
    await expect(
      page.getByText(copy.identification.allEntered(2, BOS_TAURUS))
    ).toBeVisible()
  })

  // One animal has nothing to add after it, so the card offers no button of
  // its own — the page's Save and continue is what captures the record.
  test('offers no in-card button on a line of one animal and saves it on Save and continue', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['1'])
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 1, 1)
      })
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toHaveCount(0)
    await expect(
      inCardSaveButton(page, copy.identification.saveAndFinish)
    ).toHaveCount(0)

    await page.locator(EAR_TAG_FIELD).fill('UK000000000001')
    await saveAndContinue(page)

    await page
      .getByRole('link', { name: hubCopy.rows.animalIdentification.title })
      .click()
    await expect(
      savedAnimalRow(page, BOS_TAURUS, 1).getByRole('cell', {
        name: 'UK000000000001',
        exact: true
      })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations on the last outstanding animal', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await addCowRecord(page, 'UK000000000001')
    await expect(
      inCardSaveButton(page, copy.identification.saveAndFinish)
    ).toBeVisible()
    await expectAxeClean(page, 'Animal identification on the last animal')
  })
})

test.describe('animal identification selected commodities summary', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('opens with a summary of what the consignment holds, one line per card', async ({
    page
  }) => {
    await openIdentification(
      page,
      [
        ['Cow', [BOS_TAURUS]],
        ['Horse', [EQUUS_CABALLUS]]
      ],
      ['2', '3']
    )
    const summary = selectedCommoditiesSummary(page)

    for (const head of [
      copy.identification.summary.commodityCode,
      copy.identification.summary.commonName,
      copy.identification.summary.numberOfAnimals
    ]) {
      await expect(
        summary.getByRole('columnheader', { name: head, exact: true })
      ).toBeVisible()
    }

    await expectSummaryRow(summary, DOMESTIC_CATTLE, '0102', '2')
    await expectSummaryRow(summary, 'Horse', '0101', '3')

    const main = await page.locator('main').innerHTML()
    expect(main.indexOf(copy.identification.summary.caption)).toBeLessThan(
      main.indexOf('identification-card-0')
    )
  })

  test('changes the commodity list from a summary row', async ({ page }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await selectedCommoditiesSummary(page)
      .getByRole('link', {
        name: `${copy.identification.summary.change} ${DOMESTIC_CATTLE}`
      })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })

  // The route back to the commodity question used to appear only when there
  // was nothing to identify, so it vanished as the page became usable.
  test('offers Add another commodity while there are commodities to identify', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await page
      .getByRole('link', { name: copy.identification.addAnotherCommodity })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })
})

test.describe('animal identification identifier validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('validation: an empty record links to and focuses the first identifier', async ({
    page
  }) => {
    await openCatIdentification(page)
    await submitAdd(page)

    // The microchip heads a cat's identifiers, so it is the field the
    // at-least-one-identifier error names.
    await expectErrorFocus(
      page,
      copy.identification.errors.atLeastOneIdentifier,
      MICROCHIP_FIELD
    )
    await expect(page.locator(MICROCHIP_FIELD)).toHaveValue('')
  })

  for (const [commodity, species, field, label] of identifierValidations) {
    test(`validation: ${label} over ${MAX_IDENTIFIER_LENGTH} characters links to and focuses the preserved value`, async ({
      page
    }) => {
      await openIdentification(page, [[commodity, [species]]])
      const invalid = 'X'.repeat(MAX_IDENTIFIER_LENGTH + 1)
      await page.locator(`#${field}-0`).fill(invalid)
      await saveAndContinue(page)

      await expectErrorFocus(
        page,
        copy.identification.errors.identifierMax[field],
        `#${field}-0`
      )
      await expect(page.locator(`#${field}-0`)).toHaveValue(invalid)
    })
  }

  test('has no serious or critical axe violations in the microchip error state', async ({
    page
  }) => {
    await openCatIdentification(page)
    await page
      .locator(MICROCHIP_FIELD)
      .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
    await saveAndContinue(page)

    await expect(
      errorLink(
        page,
        copy.identification.errors.identifierMax.animalIdentifierMicrochip
      )
    ).toBeVisible()
    await expectAxeClean(page, 'Animal identification with a microchip error')
  })
})

test.describe('animal identification address validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const [name, field] of requiredAddressValidations) {
    test(`permanent address validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await openCatIdentification(page)
      await fillCatRecord(page)
      await page.locator(`#${field}-0`).fill('')
      await submitAdd(page)

      await expectErrorFocus(
        page,
        copy.identification.errors.addressMandatory[field],
        `#${field}-0`
      )
      await expect(page.locator(`#${field}-0`)).toHaveValue('')
      await expect(page.locator(PASSPORT_FIELD)).toHaveValue(PASSPORT_NUMBER)
    })
  }

  for (const [name, field, invalid] of addressFormatValidations) {
    test(`permanent address validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await openCatIdentification(page)
      await fillCatRecord(page, { ...validPermanentAddress, [field]: invalid })
      await submitAdd(page)

      await expectErrorFocus(
        page,
        copy.identification.errors.addressFormat[field],
        `#${field}-0`
      )
      await expect(page.locator(`#${field}-0`)).toHaveValue(invalid)
      await expect(page.locator(PASSPORT_FIELD)).toHaveValue(PASSPORT_NUMBER)
    })
  }
})

test.describe('animal identification records', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('adds a complete record and reads it back as a row of the saved-animals table', async ({
    page
  }) => {
    const row = await addCatRecordRow(page)

    await expect(
      columnHeader(page, copy.identification.table.animalColumn)
    ).toBeVisible()
    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierMicrochip
      )
    ).toBeVisible()
    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierPassport
      )
    ).toBeVisible()
    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierTattoo
      )
    ).toBeVisible()
    await expect(
      columnHeader(page, copy.identification.table.permanentAddressColumn)
    ).toBeVisible()

    await expect(
      row.getByRole('cell', { name: MICROCHIP_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      row.getByRole('cell', { name: PASSPORT_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      row.getByRole('cell', { name: 'Pet Owner', exact: true })
    ).toBeVisible()
  })

  test('heads the table with every identifier the commodity declares, not only the ones filled in', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await addCowRecord(page, 'UK000000000001')

    await expect(
      columnHeader(page, copy.identification.table.animalColumn)
    ).toBeVisible()
    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierPassport
      )
    ).toBeVisible()
    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierEarTag
      )
    ).toBeVisible()
    await expect(
      savedAnimalRow(page, BOS_TAURUS, 1).getByRole('cell', {
        name: 'UK000000000001',
        exact: true
      })
    ).toBeVisible()
  })

  // Microchipping is how a dog is identified in law, so a chip number on its
  // own has to be enough to save the animal.
  test('saves a dog identified only by its microchip and reads the number back', async ({
    page
  }) => {
    await openIdentification(page, [['Dog', [CANIS_LUPUS_FAMILIARIS]]], ['2'])
    await page.locator(MICROCHIP_FIELD).fill(MICROCHIP_NUMBER)
    await fillAddress(page)
    await submitAdd(page)

    await expect(
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierMicrochip
      )
    ).toBeVisible()
    await page.reload()
    await expect(
      savedAnimalRow(page, CANIS_LUPUS_FAMILIARIS, 1).getByRole('cell', {
        name: MICROCHIP_NUMBER,
        exact: true
      })
    ).toBeVisible()
  })

  test('removes an added record', async ({ page }) => {
    await addCatRecordRow(page)
    const row = await removeAnimalRow(page, FELIS_CATUS, 1)
    await expect(row).toHaveCount(0)
  })

  test('has no serious or critical axe violations once an animal is saved', async ({
    page
  }) => {
    const row = await addCatRecordRow(page)
    await expect(row).toBeVisible()
    await expectAxeClean(page, 'Animal identification with a saved animal')
  })

  test('rejects a stale add action after the animal-count cap is reached', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await addCowRecord(page, 'UK000000000001')
    await addCowRecord(page, 'UK000000000002', { last: true })
    await expect(
      page.getByText(copy.identification.allEntered(2, BOS_TAURUS))
    ).toBeVisible()

    await submitStaleAdd(page)

    const link = errorLink(page, copy.identification.errors.capReached(2))
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/#identification-card-0$/)
  })

  test('blocks a count drop below saved records and reopens after removal', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 1, 2)
      })
    ).toBeVisible()
    await addCowRecord(page, 'UK000000000001')
    await addCowRecord(page, 'UK000000000002', { last: true })
    await expect(
      page.getByText(copy.identification.allEntered(2, BOS_TAURUS))
    ).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toHaveCount(0)

    await saveAndContinue(page)
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.locator('#numberOfAnimalsQuantity-0').fill('1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    const countDrop = copy.consignmentDetails.errors.countDrop(2, BOS_TAURUS, 1)
    await expect(errorLink(page, countDrop)).toBeVisible()
    await errorLink(page, countDrop).click()

    await removeAnimalRow(page, BOS_TAURUS, 2)
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 2, 2)
      })
    ).toBeVisible()
  })
})
