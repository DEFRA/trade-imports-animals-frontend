import { expect, test } from '@playwright/test'
import {
  PHONE_VIEWPORT,
  answerCountryOfOrigin,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  expectSpeciesSelected,
  journeyUrl,
  searchCommodities,
  selectSpecies,
  signIn,
  startNotification,
  withinFullWidthColumn,
  withinTwoThirdsColumn
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { animalIdentificationPage } from '../page.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const IDENTIFICATION_SLUG = animalIdentificationPage.slug
const PASSPORT_FIELD = '#animalIdentifierPassport-0'
const MICROCHIP_FIELD = '#animalIdentifierMicrochip-0'
const EAR_TAG_FIELD = '#animalIdentifierEarTag-0'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const EQUUS_CABALLUS = 'Equus caballus'
const CANIS_LUPUS_FAMILIARIS = 'Canis lupus familiaris'
const SALMO_SALAR = 'Salmo salar'
const BISON_BISON = 'Bison bison'
const COW = 'Cow'
const CAT = 'Cat'
const COW_HEADING = 'Cow (0102)'
const GOVUK_GREEN = 'rgb(15, 122, 82)'
const REGULAR_FONT_WEIGHT = '400'
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
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page
    .getByRole('link', {
      name: hubCopy.rows.consignmentDetails.title,
      exact: true
    })
    .click()
  for (const index of lineIndicesOf(selections)) {
    await page
      .locator(`#numberOfAnimalsQuantity-${index}`)
      .fill(counts[index] ?? DEFAULT_ANIMALS_COUNT)
  }
}

const expectIdentificationDetails = (page) =>
  expect(
    page.getByRole('heading', { name: 'Identification details', exact: true })
  ).toBeVisible()

const openIdentification = async (page, selections, counts = []) => {
  await addLines(page, selections, counts)
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page
    .getByRole('link', { name: hubCopy.rows.animalIdentification.title })
    .click()
  await expectIdentificationDetails(page)
}

const openCatIdentification = (page) =>
  openIdentification(page, [['Cat', [FELIS_CATUS]]], ['2'])

const entryLabelsOf = (fields) =>
  fields.map((field) => copy.identification.identifierLabels[field])

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const expectErrorFocus = async (page, message, selector) => {
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator(selector)).toBeFocused()
}

const validPermanentAddress = {
  nameOrOrganisationName: 'Pet Owner',
  addressLine1: '1 Farm Lane',
  addressLine2: 'Apartment 2',
  townOrCity: 'Skipton',
  county: 'North Yorkshire',
  postcode: 'BD23 1UD',
  phone: '+44 1756 555 0192',
  email: 'owner@example.co.uk'
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

const submitFinish = (page) =>
  page.getByRole('button', { name: copy.identification.saveAndFinish }).click()

const inCardSaveButton = (page, name) =>
  page.getByRole('button', { name, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: SAVE_AND_CONTINUE, exact: true }).click()

const savedAnimalRow = (page, species, number) =>
  page
    .getByRole('row')
    .filter({ hasText: copy.identification.animalRowNamed(species, number) })

const submitOverLongMicrochip = async (page) => {
  await openIdentification(page, [['Cat', [FELIS_CATUS]]], ['1'])
  await page
    .locator(MICROCHIP_FIELD)
    .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
  await saveAndContinue(page)
}

const expectCompleteCard = async (page, species, savedRows) => {
  const card = speciesCard(page, species)
  await expect(card.getByRole('heading')).toHaveText([species])
  await expect(card.getByRole('button')).toHaveText(
    Array(savedRows).fill(new RegExp(`^${copy.identification.removeRow}`))
  )
  await expect(card.getByRole('textbox')).toHaveCount(0)
}

const columnHeader = (page, name) =>
  page.getByRole('columnheader', { name, exact: true })

const selectedCommoditiesSummary = (page) =>
  page.getByRole('table', { name: copy.selectedCommodities.caption })

const expectSummaryRow = async (
  summary,
  { code, name, latinNames, animals }
) => {
  const cells = summary
    .getByRole('row')
    .filter({ has: summary.page().getByRole('cell', { name, exact: true }) })
    .getByRole('cell')
  await expect(cells.nth(0)).toHaveText(code)
  await expect(cells.nth(1)).toHaveText(name)
  for (const latinName of latinNames) {
    await expect(cells.nth(2)).toContainText(latinName)
  }
  await expect(cells.nth(3)).toHaveText(animals)
}

const commodityHeading = (page, heading) =>
  page.getByRole('heading', { level: 2, name: heading })

const speciesCard = (page, species) =>
  page.getByRole('region', { name: species, exact: true })

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
  ['postcode or Zip code', 'postcode'],
  ['phone number', 'phone'],
  ['email address', 'email']
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
    'postcode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1)
  ],
  [
    'phone number over 20 characters',
    'phone',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1)
  ],
  [
    'email address over 254 characters',
    'email',
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
    await expect(page.locator('#animalIdentifierTattoo-0')).toHaveCount(0)
    await expect(page.locator('#animalIdentifierMicrochip-1')).toBeVisible()
    await expect(page.locator('#horseName-1')).toBeVisible()
    await expect(page.locator(MICROCHIP_FIELD)).toHaveCount(0)
    await expect(page.locator('#animalIdentifierMicrochip-2')).toHaveCount(0)
    await expect(page.locator('#identification-card-2')).toHaveCount(0)
    await expect(page.locator('#nameOrOrganisationName-0')).toHaveCount(0)
  })

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

  test('permanent address labels the postcode and phone fields and hints the country code', async ({
    page
  }) => {
    await openCatIdentification(page)

    await expect(
      page.getByLabel(copy.identification.address.postcode, {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.identification.address.phone, {
        exact: true
      })
    ).toHaveAccessibleDescription(copy.identification.addressHints.phone)
  })

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

  test('offers Change number of animals on every card, naming its species, and lands on the consignment details page', async ({
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
    await expect(
      speciesCard(page, BOS_TAURUS).getByRole('link', {
        name: `${copy.identification.changeAnimalCount} ${BOS_TAURUS}`,
        exact: true
      })
    ).toBeVisible()
    await expect(
      speciesCard(page, EQUUS_CABALLUS).getByRole('link', {
        name: `${copy.identification.changeAnimalCount} ${EQUUS_CABALLUS}`,
        exact: true
      })
    ).toBeVisible()

    await changeCount.first().click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('2')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]])
    await expectNoSeriousOrCriticalViolations(page, 'Animal identification')
  })

  test('has no serious or critical axe violations with the microchip field rendered', async ({
    page
  }) => {
    await openCatIdentification(page)
    await expect(page.locator(MICROCHIP_FIELD)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a microchip field'
    )
  })

  test('carries a consignment with nothing to identify past the page', async ({
    page
  }) => {
    await addLines(page, [['Fish', [SALMO_SALAR]]], ['3'])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, IDENTIFICATION_SLUG))

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Identification details', exact: true })
    ).toHaveCount(0)
  })
})

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
    await expectCompleteCard(page, BOS_TAURUS, 2)
  })

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
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification on the last animal'
    )
  })
})

test.describe('animal identification selected commodities summary', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('heads the summary with the code, common name, species and number of animals', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])

    await expect(
      selectedCommoditiesSummary(page).getByRole('columnheader')
    ).toHaveText([
      copy.selectedCommodities.commodityCode,
      copy.selectedCommodities.commonName,
      copy.selectedCommodities.species,
      copy.selectedCommodities.numberOfAnimals,
      copy.selectedCommodities.actionsHidden
    ])
  })

  test('sums two cattle species into one row and gives each species of an 01061900 commodity its own row', async ({
    page
  }) => {
    await openIdentification(
      page,
      [
        [COW, [BOS_TAURUS, BISON_BISON]],
        [CAT, [FELIS_CATUS]]
      ],
      ['2', '3', '4']
    )
    const summary = selectedCommoditiesSummary(page)

    await expectSummaryRow(summary, {
      code: '0102',
      name: COW,
      latinNames: [BOS_TAURUS, BISON_BISON],
      animals: '5'
    })
    await expectSummaryRow(summary, {
      code: '01061900',
      name: CAT,
      latinNames: [FELIS_CATUS],
      animals: '4'
    })
    await expect(summary.or(commodityHeading(page, COW_HEADING))).toContainText(
      [copy.selectedCommodities.caption, COW_HEADING]
    )
  })

  test('changes the commodity list from a summary row and returns to identification details listing the added commodity', async ({
    page
  }) => {
    await openIdentification(page, [[COW, [BOS_TAURUS]]], ['2'])
    await selectedCommoditiesSummary(page)
      .getByRole('link', {
        name: `${copy.identification.summary.change} ${COW}`
      })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
    await expectSpeciesSelected(page, BOS_TAURUS)

    await selectSpecies(page, [FELIS_CATUS])
    await saveAndContinue(page)

    await expectIdentificationDetails(page)
    await expect(
      selectedCommoditiesSummary(page).getByRole('cell', {
        name: CAT,
        exact: true
      })
    ).toBeVisible()
  })

  test('removes a commodity from a summary row and returns to identification details listing only the commodities left', async ({
    page
  }) => {
    await openIdentification(
      page,
      [
        [COW, [BOS_TAURUS]],
        [CAT, [FELIS_CATUS]]
      ],
      ['2', '3']
    )
    await selectedCommoditiesSummary(page)
      .getByRole('link', {
        name: `${copy.identification.summary.change} ${CAT}`
      })
      .click()
    await searchCommodities(page, FELIS_CATUS)
    await page.getByRole('checkbox', { name: FELIS_CATUS }).uncheck()
    await saveAndContinue(page)

    await expectIdentificationDetails(page)
    const summary = selectedCommoditiesSummary(page)
    await expectSummaryRow(summary, {
      code: '0102',
      name: COW,
      latinNames: [BOS_TAURUS],
      animals: '2'
    })
    await expect(summary.locator('tbody').getByRole('row')).toHaveText([
      new RegExp(`0102\\s*${COW}`)
    ])
  })

  test('offers Add another commodity while there are commodities to identify and returns to identification details after one is added', async ({
    page
  }) => {
    await openIdentification(page, [[COW, [BOS_TAURUS]]], ['2'])
    await page
      .getByRole('link', { name: copy.identification.addAnotherCommodity })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()

    await selectSpecies(page, [FELIS_CATUS])
    await saveAndContinue(page)

    await expectIdentificationDetails(page)
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
    await submitOverLongMicrochip(page)

    await expect(
      errorLink(
        page,
        copy.identification.errors.identifierMax.animalIdentifierMicrochip
      )
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a microchip error'
    )
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
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a saved animal'
    )
  })

  test('rejects a stale add action after the animal-count cap is reached', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await addCowRecord(page, 'UK000000000001')
    await addCowRecord(page, 'UK000000000002', { last: true })
    await expectCompleteCard(page, BOS_TAURUS, 2)

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
    await expectCompleteCard(page, BOS_TAURUS, 2)
    await expect(page.locator(EAR_TAG_FIELD)).toHaveCount(0)

    await saveAndContinue(page)
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', {
        name: hubCopy.rows.consignmentDetails.title,
        exact: true
      })
      .click()
    await page.locator('#numberOfAnimalsQuantity-0').fill('1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    const countDrop = copy.consignmentDetails.errors.countDrop(2, BOS_TAURUS, 1)
    await expect(errorLink(page, countDrop)).toBeVisible()
    await errorLink(page, countDrop).click()
    await expect(page).toHaveURL(/#identification-card-0$/)
    await expect(
      commodityHeading(page, COW_HEADING)
        .locator('xpath=following::*[@id="identification-card-0"]')
        .first()
    ).toBeVisible()

    await removeAnimalRow(page, BOS_TAURUS, 2)
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 2, 2)
      })
    ).toBeVisible()
  })
})

test.describe('animal identification sections and species cards', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('groups a commodity into a section headed by its name and code holding one card per species in the order the species are listed for selection', async ({
    page
  }) => {
    await openIdentification(
      page,
      [['Cow', [BOS_TAURUS, BISON_BISON]]],
      ['2', '3']
    )

    await expect(commodityHeading(page, COW_HEADING)).toBeVisible()
    await expect(page.locator('main h1, main h2, main h3, main h4')).toHaveText(
      [
        copy.identification.title,
        COW_HEADING,
        BISON_BISON,
        copy.identification.counter(BISON_BISON, 1, 2),
        BOS_TAURUS,
        copy.identification.counter(BOS_TAURUS, 1, 3)
      ]
    )
  })

  test('puts the entry form and its button above the saved animals while animals remain', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['3'])
    await addCowRecord(page, 'UK000000000001')

    const card = speciesCard(page, BOS_TAURUS)
    const button = card.getByRole('button', {
      name: copy.identification.saveAndAddAnother
    })
    const inDocumentOrder = card
      .getByRole('heading', { level: 4 })
      .or(card.locator(EAR_TAG_FIELD))
      .or(button)
      .or(card.getByRole('table'))
    await expect
      .poll(() =>
        inDocumentOrder.evaluateAll((elements) =>
          elements.map((element) => element.tagName)
        )
      )
      .toEqual(['H4', 'INPUT', 'BUTTON', 'TABLE'])
  })

  test('shows the card button as a primary button', async ({ page }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])

    await expect(
      page.getByRole('button', { name: copy.identification.saveAndAddAnother })
    ).toHaveCSS('background-color', GOVUK_GREEN)
  })

  test('labels the identifier fields in regular weight with no hint', async ({
    page
  }) => {
    await openIdentification(page, [['Cat', [FELIS_CATUS]]], ['2'])

    for (const field of [
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ]) {
      await expect(page.locator(`label[for="${field}-0"]`)).toHaveText(
        copy.identification.identifierLabels[field]
      )
      await expect(page.locator(`label[for="${field}-0"]`)).toHaveCSS(
        'font-weight',
        REGULAR_FONT_WEIGHT
      )
      await expect(page.locator(`#${field}-0`)).toHaveAccessibleDescription('')
    }
  })

  test('lays out the intro in a two-thirds column and the cards in the full-width column', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])

    await expect(
      withinTwoThirdsColumn(
        page.getByRole('heading', { name: copy.identification.title })
      )
    ).toHaveCount(1)
    await expect(
      withinTwoThirdsColumn(page.getByText(copy.identification.inset))
    ).toHaveCount(1)
    const card = speciesCard(page, BOS_TAURUS)
    await expect(withinFullWidthColumn(card)).toHaveCount(1)
    await expect(withinTwoThirdsColumn(card)).toHaveCount(0)
  })

  test('shows the length error text for an over-long microchip', async ({
    page
  }) => {
    await submitOverLongMicrochip(page)

    await expect(
      errorLink(
        page,
        copy.identification.errors.identifierMax.animalIdentifierMicrochip
      )
    ).toBeVisible()
  })

  test('has no serious or critical axe violations with one complete card and one card mid-entry', async ({
    page
  }) => {
    await openIdentification(
      page,
      [
        ['Cow', [BOS_TAURUS]],
        ['Horse', [EQUUS_CABALLUS]]
      ],
      ['2', '1']
    )
    await addCowRecord(page, 'UK000000000001')
    await addCowRecord(page, 'UK000000000002', { last: true })
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a complete card and a card mid-entry'
    )
  })
})

test.describe('animal identification on a phone', () => {
  test.use({ viewport: PHONE_VIEWPORT })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('keeps the summary and a cat card with a saved animal inside the screen width', async ({
    page
  }) => {
    await openCatIdentification(page)
    await fillCatRecord(page)
    await submitAdd(page)

    await expectNoHorizontalOverflow(
      selectedCommoditiesSummary(page),
      'Selected commodities summary'
    )
    await expectNoHorizontalOverflow(
      speciesCard(page, FELIS_CATUS),
      'Felis catus card'
    )
  })
})

test.describe('animal identification without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test("saves only the pressed card's species and reloads with its form empty", async ({
    page
  }) => {
    await openIdentification(
      page,
      [['Cow', [BOS_TAURUS, BISON_BISON]]],
      ['2', '2']
    )
    await page.locator(EAR_TAG_FIELD).fill('UK000000000001')
    await page
      .locator('#animalIdentifierEarTag-1')
      .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
    await speciesCard(page, BISON_BISON)
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()

    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
    await expect(savedAnimalRow(page, BISON_BISON, 1)).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toHaveValue('')
    await expect(page.locator('#animalIdentifierEarTag-1')).toHaveValue('')
    await expect(
      speciesCard(page, BOS_TAURUS).getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 1, 2),
        exact: true
      })
    ).toBeVisible()
    await expect(speciesCard(page, BOS_TAURUS).getByRole('table')).toHaveCount(
      0
    )
  })

  test('saves the card typed in when Enter is pressed and stays on identification details', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', [BOS_TAURUS]]], ['2'])
    await page.locator(EAR_TAG_FIELD).fill('UK000000000001')
    await page.locator(EAR_TAG_FIELD).press('Enter')

    await expect(
      page.getByRole('heading', { level: 1, name: copy.identification.title })
    ).toBeVisible()
    await expect(
      speciesCard(page, BOS_TAURUS).getByRole('heading', {
        name: copy.identification.counter(BOS_TAURUS, 2, 2),
        exact: true
      })
    ).toBeVisible()
    await expect(
      savedAnimalRow(page, BOS_TAURUS, 1).getByRole('cell', {
        name: 'UK000000000001',
        exact: true
      })
    ).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toHaveValue('')
  })
})
