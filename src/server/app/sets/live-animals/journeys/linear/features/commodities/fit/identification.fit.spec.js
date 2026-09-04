import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const PASSPORT_FIELD = '#animalIdentifierPassport-0'
const EAR_TAG_FIELD = '#animalIdentifierEarTag-0'
const COUNTRY_FIELD = '#country-0'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const SALMO_SALAR = 'Salmo salar'
const DOMESTIC_CATTLE = 'Domestic cattle'
const ATLANTIC_SALMON = 'Atlantic salmon'
const INVALID_COUNTRY = 'Invalid country'
const PASSPORT_NUMBER = 'UK123456789'
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
  await page.getByRole('link', { name: copy.identification.title }).click()
  await expect(
    page.getByRole('heading', { name: copy.identification.title })
  ).toBeVisible()
}

const openCatIdentification = (page) =>
  openIdentification(page, [['Cat', [FELIS_CATUS]]], ['2'])

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

const validCatAddress = {
  nameOrOrganisationName: 'Pet Owner',
  addressLine1: '1 Farm Lane',
  addressLine2: 'Apartment 2',
  townOrCity: 'Skipton',
  county: 'North Yorkshire',
  postalOrZipCode: 'BD23 1UD',
  country: 'United Kingdom',
  telephoneNumber: '+44 1756 555 0192',
  emailAddress: 'owner@example.co.uk'
}

const fillCatRecord = async (page, address = validCatAddress) => {
  await page.locator(PASSPORT_FIELD).fill(PASSPORT_NUMBER)
  for (const [field, value] of Object.entries(address)) {
    const control = page.locator(`#${field}-0`)
    if (field === 'country') {
      await control.selectOption(value)
    } else {
      await control.fill(value)
    }
  }
}

const submitAdd = (page) =>
  page
    .getByRole('button', { name: copy.identification.saveAndAddAnother })
    .click()

const saveAndFinish = (page) =>
  page.getByRole('button', { name: copy.identification.saveAndFinish }).click()

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

const addCowRecord = async (page, earTag) => {
  await page.locator(EAR_TAG_FIELD).fill(earTag)
  await submitAdd(page)
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
  ['Cow', BOS_TAURUS, 'animalIdentifierPassport', 'Passport'],
  ['Cow', BOS_TAURUS, 'animalIdentifierTattoo', 'Tattoo'],
  ['Cow', BOS_TAURUS, 'animalIdentifierEarTag', 'Ear tag'],
  ['Horse', 'Equus caballus', 'horseName', 'Horse name'],
  [
    'Fish',
    SALMO_SALAR,
    'animalIdentifierIdentificationDetails',
    'Identification details'
  ],
  ['Fish', SALMO_SALAR, 'animalIdentifierDescription', 'Description']
]

const requiredAddressValidations = [
  ['name or organisation name', 'nameOrOrganisationName'],
  ['address line 1', 'addressLine1'],
  ['town or city', 'townOrCity'],
  ['postal or zip code', 'postalOrZipCode'],
  ['country', 'country'],
  ['telephone number', 'telephoneNumber'],
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
    'postal or zip code over 12 characters',
    'postalOrZipCode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1)
  ],
  [
    'telephone number over 20 characters',
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
      ['Horse', ['Equus caballus']],
      ['Fish', [SALMO_SALAR]]
    ])

    await expect(page.getByText(copy.identification.inset)).toBeVisible()
    await expect(page.locator(PASSPORT_FIELD)).toBeVisible()
    await expect(page.locator('#animalIdentifierTattoo-0')).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toBeVisible()
    await expect(page.locator('#horseName-1')).toBeVisible()
    await expect(
      page.locator('#animalIdentifierIdentificationDetails-2')
    ).toBeVisible()
    await expect(page.locator('#animalIdentifierDescription-2')).toBeVisible()
    await expect(page.locator('#nameOrOrganisationName-0')).toHaveCount(0)
  })

  test('back link returns to the overview', async ({ page }) => {
    await openCatIdentification(page)
    await page.locator('.govuk-back-link').click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openIdentification(page, [['Fish', [SALMO_SALAR]]])
    await expectAxeClean(page, 'Animal identification')
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
        ['Fish', [SALMO_SALAR]]
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
    await expectSummaryRow(summary, ATLANTIC_SALMON, '0301', '3')

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

    await expectErrorFocus(
      page,
      copy.identification.errors.atLeastOneIdentifier,
      PASSPORT_FIELD
    )
    await expect(page.locator(PASSPORT_FIELD)).toHaveValue('')
  })

  for (const [commodity, species, field, label] of identifierValidations) {
    test(`validation: ${label} over ${MAX_IDENTIFIER_LENGTH} characters links to and focuses the preserved value`, async ({
      page
    }) => {
      await openIdentification(page, [[commodity, [species]]])
      const invalid = 'X'.repeat(MAX_IDENTIFIER_LENGTH + 1)
      await page.locator(`#${field}-0`).fill(invalid)
      await saveAndFinish(page)

      await expectErrorFocus(
        page,
        copy.identification.errors.identifierMax[field],
        `#${field}-0`
      )
      await expect(page.locator(`#${field}-0`)).toHaveValue(invalid)
    })
  }
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
      if (field === 'country') {
        await page.locator(COUNTRY_FIELD).selectOption('')
      } else {
        await page.locator(`#${field}-0`).fill('')
      }
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
      await fillCatRecord(page, { ...validCatAddress, [field]: invalid })
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

  test('permanent address validation: an out-of-list country focuses the cleared select and preserves the record', async ({
    page
  }) => {
    await openCatIdentification(page)
    await fillCatRecord(page)
    await page.locator(COUNTRY_FIELD).evaluate((select, invalidCountry) => {
      select.add(new Option(invalidCountry, invalidCountry))
      select.value = invalidCountry
    }, INVALID_COUNTRY)
    await submitAdd(page)

    await expectErrorFocus(
      page,
      copy.identification.errors.addressFormat.country,
      COUNTRY_FIELD
    )
    await expect(page.locator(COUNTRY_FIELD)).toHaveValue('')
    await expect(page.locator(PASSPORT_FIELD)).toHaveValue(PASSPORT_NUMBER)
  })
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
    await addCowRecord(page, 'UK000000000002')
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
    await addCowRecord(page, 'UK000000000002')
    await expect(
      page.getByText(copy.identification.allEntered(2, BOS_TAURUS))
    ).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toHaveCount(0)

    await saveAndFinish(page)
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
