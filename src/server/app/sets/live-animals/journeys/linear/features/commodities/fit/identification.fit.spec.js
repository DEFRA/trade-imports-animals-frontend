import { expect, test } from '@playwright/test'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  CAPRA_HIRCUS_ROW,
  EQUUS_ASINUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  OVIS_ARIES_ROW,
  PHONE_VIEWPORT,
  removeAnimalRow,
  saveAndContinue,
  saveAndReturnToHub,
  savedAnimalRow,
  STRUTHIO_ROW,
  SUS_SCROFA_DOMESTICUS_ROW,
  numberOfAnimalsFor,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  expectOverview,
  expectThreeSaveControls,
  journeyUrl,
  LANDINGS,
  openCommodityDetails,
  openOverview,
  selectSpecies,
  signIn,
  withinFullWidthColumn,
  withinTwoThirdsColumn
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { animalIdentificationPage } from '../page.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'
import { labelFor } from '../search/test-support.js'

const IDENTIFICATION_SLUG = animalIdentificationPage.slug
const PASSPORT_FIELD = '#animalIdentifierPassport-0'
const MICROCHIP_FIELD = '#animalIdentifierMicrochip-0'
const EAR_TAG_FIELD = '#animalIdentifierEarTag-0'
const SECOND_EAR_TAG_FIELD = '#animalIdentifierEarTag-1'
const ERROR_SUMMARY_SELECTOR = '.govuk-error-summary'
const BOS_TAURUS_CODE_HEADING = BOS_TAURUS_ROW.commodityCode
const REGULAR_FONT_WEIGHT = '400'
const PASSPORT_NUMBER = 'UK123456789'
const MICROCHIP_NUMBER = '900123456789012'
const MAX_IDENTIFIER_LENGTH = 58
const DEFAULT_ANIMALS_COUNT = '1'
const FIRST_LINE_ENTRY_LABEL_SELECTOR = 'label[for$="-0"]'
const IDENTIFICATION_DETAILS_VALUE = 'Scar on left wing'
const DESCRIPTION_VALUE = 'Dark plumage'

const addLines = async (page, speciesWithCounts) => {
  await openCommodityDetails(
    page,
    speciesWithCounts.map(([chosen]) => chosen)
  )
  for (const [chosen, count = DEFAULT_ANIMALS_COUNT] of speciesWithCounts) {
    await (await numberOfAnimalsFor(page, chosen)).fill(count)
  }
}

const openIdentificationFromHub = (page) =>
  page
    .getByRole('link', { name: hubCopy.rows.animalIdentification.title })
    .click()

const reopenIdentificationFromHub = async (page) => {
  await openOverview(page)
  await openIdentificationFromHub(page)
}

const openIdentification = async (page, speciesWithCounts) => {
  await addLines(page, speciesWithCounts)
  await saveAndReturnToHub(page).click()
  await openIdentificationFromHub(page)
  await expect(
    page.getByRole('heading', { name: copy.identification.title, exact: true })
  ).toBeVisible()
}

const openFelisCatusIdentification = (page) =>
  openIdentification(page, [[FELIS_CATUS_ROW, '2']])

const entryLabelsOf = (fields) =>
  fields.map((field) => copy.identification.identifierLabels[field])

const PET_CODE_COLUMN_HEADINGS = [
  copy.identification.table.animalColumn,
  ...entryLabelsOf([
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'animalIdentifierTattoo'
  ]),
  copy.identification.table.actionsHidden
]

const errorLink = (page, message) =>
  page.locator(ERROR_SUMMARY_SELECTOR).getByRole('link', { name: message })

const expectErrorFocus = async (page, message, field) => {
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  await expect(field).toBeFocused()
}

const fillFelisCatusRecord = async (page) => {
  await page.locator(MICROCHIP_FIELD).fill(MICROCHIP_NUMBER)
  await page.locator(PASSPORT_FIELD).fill(PASSPORT_NUMBER)
}

const submitAdd = (page) =>
  page
    .getByRole('button', { name: copy.identification.saveAndAddAnother })
    .click()

const submitSaveAndFinish = (page) =>
  page.getByRole('button', { name: copy.identification.saveAndFinish }).click()

const inCardSaveButton = (page, name) =>
  page.getByRole('button', { name, exact: true })

const submitOverLongMicrochip = async (page) => {
  await openIdentification(page, [[FELIS_CATUS_ROW, '1']])
  await page
    .locator(MICROCHIP_FIELD)
    .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
  await saveAndContinue(page).click()
}

const expectCompleteCard = async (page, chosen, savedRows) => {
  const card = speciesCard(page, chosen)
  await expect(card.getByRole('heading')).toHaveText([
    labelFor(chosen.speciesLatinName)
  ])
  await expect(card.getByRole('button')).toHaveText(
    Array(savedRows).fill(new RegExp(`^${copy.identification.removeRow}`))
  )
  await expect(card.getByRole('textbox')).toHaveCount(0)
}

const columnHeader = (page, name) =>
  page.getByRole('columnheader', { name, exact: true })

const selectedCommoditiesSummary = (page) =>
  page.getByRole('table', { name: copy.selectedCommodities.caption })

const expectSummaryRow = async (summary, { code, labels, animals }) => {
  const cells = summary
    .getByRole('row')
    .filter({
      has: summary.page().getByRole('cell', { name: labels[0] })
    })
    .getByRole('cell')
  await expect(cells.nth(0)).toHaveText(code)
  for (const label of labels) {
    await expect(cells.nth(1)).toContainText(label)
  }
  await expect(cells.nth(2)).toHaveText(animals)
}

const commodityHeading = (page, heading) =>
  page.getByRole('heading', { level: 2, name: heading })

const speciesCard = (page, chosen) =>
  page.getByRole('region', {
    name: labelFor(chosen.speciesLatinName),
    exact: true
  })

const saveSoleAnimalAndReopenCard = async (page, chosen, field, value) => {
  await page.locator(`#${field}-0`).fill(value)
  await saveAndContinue(page).click()
  await reopenIdentificationFromHub(page)
  return speciesCard(page, chosen)
}

const addBosTaurusRecord = async (page, earTag, { last = false } = {}) => {
  await page.locator(EAR_TAG_FIELD).fill(earTag)
  await (last ? submitSaveAndFinish(page) : submitAdd(page))
}

const addFelisCatusRecordRow = async (page) => {
  await openFelisCatusIdentification(page)
  await fillFelisCatusRecord(page)
  await submitAdd(page)
  return savedAnimalRow(page, FELIS_CATUS_ROW, 1)
}

const earTagFieldOf = (page, chosen) =>
  speciesCard(page, chosen).getByLabel(
    copy.identification.identifierLabels.animalIdentifierEarTag,
    { exact: true }
  )

const saveButtonOf = (page, chosen, name) =>
  speciesCard(page, chosen).getByRole('button', { name })

const openBosTaurusAndBisonBisonEachWithOneSaved = async (
  page,
  animalCount
) => {
  await openIdentification(page, [
    [BOS_TAURUS_ROW, animalCount],
    [BISON_BISON_ROW, animalCount]
  ])
  for (const [chosen, earTag] of [
    [BOS_TAURUS_ROW, 'UK000000000001'],
    [BISON_BISON_ROW, 'UK000000000002']
  ]) {
    await earTagFieldOf(page, chosen).fill(earTag)
    await saveButtonOf(
      page,
      chosen,
      copy.identification.saveAndAddAnother
    ).click()
  }
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
  [FELIS_CATUS_ROW, 'animalIdentifierMicrochip', 'Microchip'],
  [FELIS_CATUS_ROW, 'animalIdentifierTattoo', 'Tattoo'],
  [BOS_TAURUS_ROW, 'animalIdentifierPassport', 'Passport'],
  [BOS_TAURUS_ROW, 'animalIdentifierEarTag', 'Ear tag'],
  [BOS_TAURUS_ROW, 'animalIdentifierTattoo', 'Tattoo'],
  [EQUUS_CABALUS_ROW, 'horseName', 'Horse name'],
  [SUS_SCROFA_DOMESTICUS_ROW, 'animalIdentifierEarTag', 'Ear tag'],
  [SUS_SCROFA_DOMESTICUS_ROW, 'animalIdentifierTattoo', 'Tattoo'],
  [
    STRUTHIO_ROW,
    'identificationDetails',
    copy.identification.identifierLabels.identificationDetails
  ],
  [
    STRUTHIO_ROW,
    'description',
    copy.identification.identifierLabels.description
  ]
]

const earTagOnlyRows = [OVIS_ARIES_ROW, CAPRA_HIRCUS_ROW]

test.describe('animal identification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the identifier fields that apply to each commodity', async ({
    page
  }) => {
    await openIdentification(page, [
      [EQUUS_CABALUS_ROW],
      [BOS_TAURUS_ROW],
      [STRUTHIO_ROW]
    ])

    await expect(page.getByText(copy.identification.inset)).toBeVisible()
    await expect(page.locator(PASSPORT_FIELD)).toBeVisible()
    await expect(page.locator(MICROCHIP_FIELD)).toBeVisible()
    await expect(page.locator('#horseName-0')).toBeVisible()
    await expect(page.locator(SECOND_EAR_TAG_FIELD)).toBeVisible()
    await expect(page.locator('#animalIdentifierPassport-1')).toBeVisible()
    await expect(page.locator('#animalIdentifierTattoo-1')).toBeVisible()
    await expect(page.locator('#animalIdentifierMicrochip-1')).toHaveCount(0)
    await expect(page.locator(EAR_TAG_FIELD)).toHaveCount(0)
    await expect(page.locator('#animalIdentifierMicrochip-2')).toHaveCount(0)
    await expect(page.locator('#identificationDetails-2')).toBeVisible()
    await expect(page.locator('#description-2')).toBeVisible()
  })

  test('asks a Bos taurus line for its ear tag before its passport, and an Equus cabalus line for its microchip first', async ({
    page
  }) => {
    await openIdentification(page, [[EQUUS_CABALUS_ROW], [BOS_TAURUS_ROW]])

    await expect(page.locator(FIRST_LINE_ENTRY_LABEL_SELECTOR)).toHaveText(
      entryLabelsOf([
        'animalIdentifierMicrochip',
        'animalIdentifierPassport',
        'horseName'
      ])
    )
    await expect(page.locator('label[for$="-1"]')).toHaveText(
      entryLabelsOf([
        'animalIdentifierEarTag',
        'animalIdentifierPassport',
        'animalIdentifierTattoo'
      ])
    )
  })

  test('labels the passport, ear tag and tattoo fields on a Bos taurus line with the words the saved-animals table heads them with', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW]])

    for (const field of [
      'animalIdentifierPassport',
      'animalIdentifierEarTag',
      'animalIdentifierTattoo'
    ]) {
      await expect(page.locator(`label[for="${field}-0"]`)).toHaveText(
        copy.identification.identifierLabels[field]
      )
    }
  })

  test('asks only for the three identifier fields a Felis catus line needs, ending with its save control', async ({
    page
  }) => {
    await openFelisCatusIdentification(page)

    const card = speciesCard(page, FELIS_CATUS_ROW)
    await expect(card.getByRole('textbox')).toHaveCount(3)
    await expect(card.locator(FIRST_LINE_ENTRY_LABEL_SELECTOR)).toHaveText(
      entryLabelsOf([
        'animalIdentifierMicrochip',
        'animalIdentifierPassport',
        'animalIdentifierTattoo'
      ])
    )
    await expect(
      card.getByRole('button', { name: copy.identification.saveAndAddAnother })
    ).toBeVisible()
  })

  test('offers Save and continue, then Save and return to overview, then Cancel and return to overview', async ({
    page
  }) => {
    await openFelisCatusIdentification(page)

    await expectThreeSaveControls(page)
  })

  test('back link returns to the overview', async ({ page }) => {
    await openFelisCatusIdentification(page)
    await page.locator('.govuk-back-link').click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('offers Change number of animals on every card, naming its species, and lands on the consignment details page', async ({
    page
  }) => {
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '2'],
      [EQUUS_CABALUS_ROW, '3']
    ])
    const changeCount = page.getByRole('link', {
      name: copy.identification.changeAnimalCount
    })
    await expect(changeCount).toHaveCount(2)
    await expect(
      speciesCard(page, BOS_TAURUS_ROW).getByRole('link', {
        name: `${copy.identification.changeAnimalCount} ${labelFor(BOS_TAURUS_ROW.speciesLatinName)}`,
        exact: true
      })
    ).toBeVisible()
    await expect(
      speciesCard(page, EQUUS_CABALUS_ROW).getByRole('link', {
        name: `${copy.identification.changeAnimalCount} ${labelFor(EQUUS_CABALUS_ROW.speciesLatinName)}`,
        exact: true
      })
    ).toBeVisible()

    await changeCount.first().click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(await numberOfAnimalsFor(page, EQUUS_CABALUS_ROW)).toHaveValue(
      '3'
    )
    await expect(await numberOfAnimalsFor(page, BOS_TAURUS_ROW)).toHaveValue(
      '2'
    )
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW]])
    await expectNoSeriousOrCriticalViolations(page, 'Animal identification')
  })

  test('has no serious or critical axe violations with the microchip field rendered', async ({
    page
  }) => {
    await openFelisCatusIdentification(page)
    await expect(page.locator(MICROCHIP_FIELD)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a microchip field'
    )
  })

  test('reaches a consignment of a commodity that declares no identifier rather than skipping past the page', async ({
    page
  }) => {
    await addLines(page, [[STRUTHIO_ROW, '3']])
    await saveAndReturnToHub(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, IDENTIFICATION_SLUG))

    await expect(
      page.getByRole('heading', {
        name: copy.identification.title,
        exact: true
      })
    ).toBeVisible()
    const card = speciesCard(page, STRUTHIO_ROW)
    await expect(card.getByRole('textbox')).toHaveCount(2)
  })
})

test.describe('animal identification species-driven identifiers', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks a pig line for an ear tag and a tattoo, and heads its saved-animals table with Animal, Ear tag, Tattoo and a Remove action', async ({
    page
  }) => {
    await openIdentification(page, [[SUS_SCROFA_DOMESTICUS_ROW]])
    const card = speciesCard(page, SUS_SCROFA_DOMESTICUS_ROW)
    const absentIdentifierLabels = [
      copy.identification.identifierLabels.animalIdentifierMicrochip,
      copy.identification.identifierLabels.animalIdentifierPassport,
      copy.identification.identifierLabels.horseName
    ]
    const earTagAndTattooSavedAnimalsHead = [
      copy.identification.table.animalColumn,
      copy.identification.identifierLabels.animalIdentifierEarTag,
      copy.identification.identifierLabels.animalIdentifierTattoo,
      copy.identification.table.actionsHidden
    ]

    await expect(card.getByRole('textbox')).toHaveCount(2)
    await expect(page.locator(EAR_TAG_FIELD)).toBeVisible()
    await expect(page.locator('#animalIdentifierTattoo-0')).toBeVisible()
    for (const label of absentIdentifierLabels) {
      await expect(card.getByLabel(label, { exact: true })).toHaveCount(0)
    }

    const savedCard = await saveSoleAnimalAndReopenCard(
      page,
      SUS_SCROFA_DOMESTICUS_ROW,
      'animalIdentifierEarTag',
      'UK100000000001'
    )

    await expect(savedCard.getByRole('columnheader')).toHaveText(
      earTagAndTattooSavedAnimalsHead
    )
    const row = savedAnimalRow(page, SUS_SCROFA_DOMESTICUS_ROW, 1)
    await expect(
      row.getByRole('cell', { name: 'UK100000000001', exact: true })
    ).toBeVisible()
    await expect(
      row.getByRole('button', { name: copy.identification.removeRow })
    ).toBeVisible()
  })

  test('asks a sheep line and a goat line each for an ear tag and no other identifier, and heads each saved-animals table with Animal, Ear tag and a Remove action', async ({
    page
  }) => {
    const absentIdentifierLabels = [
      copy.identification.identifierLabels.animalIdentifierMicrochip,
      copy.identification.identifierLabels.animalIdentifierPassport,
      copy.identification.identifierLabels.animalIdentifierTattoo,
      copy.identification.identifierLabels.horseName
    ]
    const earTagSavedAnimalsHead = [
      copy.identification.table.animalColumn,
      copy.identification.identifierLabels.animalIdentifierEarTag,
      copy.identification.table.actionsHidden
    ]

    for (const chosen of earTagOnlyRows) {
      await openIdentification(page, [[chosen]])
      const card = speciesCard(page, chosen)

      await expect(card.getByRole('textbox')).toHaveCount(1)
      for (const label of absentIdentifierLabels) {
        await expect(card.getByLabel(label, { exact: true })).toHaveCount(0)
      }

      const savedCard = await saveSoleAnimalAndReopenCard(
        page,
        chosen,
        'animalIdentifierEarTag',
        'UK200000000001'
      )

      await expect(savedCard.getByRole('columnheader')).toHaveText(
        earTagSavedAnimalsHead
      )
      const row = savedAnimalRow(page, chosen, 1)
      await expect(
        row.getByRole('cell', { name: 'UK200000000001', exact: true })
      ).toBeVisible()
      await expect(
        row.getByRole('button', { name: copy.identification.removeRow })
      ).toBeVisible()
    }
  })

  test('saves an animal by its tattoo alone on a cattle line and on a pig line, and reads the tattoo back under the tattoo column', async ({
    page
  }) => {
    const tattoo = 'T'.repeat(MAX_IDENTIFIER_LENGTH)

    for (const chosen of [BOS_TAURUS_ROW, SUS_SCROFA_DOMESTICUS_ROW]) {
      await openIdentification(page, [[chosen]])

      const savedCard = await saveSoleAnimalAndReopenCard(
        page,
        chosen,
        'animalIdentifierTattoo',
        tattoo
      )

      await expect(
        savedCard.getByRole('columnheader', {
          name: copy.identification.identifierLabels.animalIdentifierTattoo,
          exact: true
        })
      ).toBeVisible()
      await expect(
        savedAnimalRow(page, chosen, 1).getByRole('cell', {
          name: tattoo,
          exact: true
        })
      ).toBeVisible()
    }
  })

  test('asks the horse species on 0101 for a horse name and the donkey species on the same code for no horse name, while both are asked for a microchip and a passport', async ({
    page
  }) => {
    await openIdentification(page, [[EQUUS_CABALUS_ROW], [EQUUS_ASINUS_ROW]])
    const horseCard = speciesCard(page, EQUUS_CABALUS_ROW)
    const donkeyCard = speciesCard(page, EQUUS_ASINUS_ROW)

    await expect(
      horseCard.getByLabel(
        copy.identification.identifierLabels.animalIdentifierMicrochip,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      horseCard.getByLabel(
        copy.identification.identifierLabels.animalIdentifierPassport,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      horseCard.getByLabel(copy.identification.identifierLabels.horseName, {
        exact: true
      })
    ).toBeVisible()
    await expect(horseCard.getByRole('textbox')).toHaveCount(3)

    await expect(
      donkeyCard.getByLabel(
        copy.identification.identifierLabels.animalIdentifierMicrochip,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      donkeyCard.getByLabel(
        copy.identification.identifierLabels.animalIdentifierPassport,
        { exact: true }
      )
    ).toBeVisible()
    await expect(donkeyCard.getByRole('textbox')).toHaveCount(2)
  })
})

test.describe('animal identification unidentified commodity', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks an unidentified commodity for identification details then description, each a labelled text input the same width as a typed identifier field with no hint', async ({
    page
  }) => {
    await openIdentification(page, [[STRUTHIO_ROW]])
    const card = speciesCard(page, STRUTHIO_ROW)

    await expect(card.getByRole('textbox')).toHaveCount(2)
    await expect(card.locator(FIRST_LINE_ENTRY_LABEL_SELECTOR)).toHaveText(
      entryLabelsOf(['identificationDetails', 'description'])
    )
    for (const field of ['identificationDetails', 'description']) {
      await expect(page.locator(`#${field}-0`)).toHaveClass(
        /govuk-input--width-20/
      )
      await expect(page.locator(`#${field}-0`)).toHaveAccessibleDescription('')
    }
  })

  test('saves identification details alone, or description alone, and heads the saved-animals table with Animal, Identification details, Description and a Remove action', async ({
    page
  }) => {
    const fallbackSavedAnimalsHead = [
      copy.identification.table.animalColumn,
      copy.identification.identifierLabels.identificationDetails,
      copy.identification.identifierLabels.description,
      copy.identification.table.actionsHidden
    ]

    await openIdentification(page, [[STRUTHIO_ROW]])
    const detailsOnlyCard = await saveSoleAnimalAndReopenCard(
      page,
      STRUTHIO_ROW,
      'identificationDetails',
      IDENTIFICATION_DETAILS_VALUE
    )
    await expect(detailsOnlyCard.getByRole('columnheader')).toHaveText(
      fallbackSavedAnimalsHead
    )
    const detailsOnlyRow = savedAnimalRow(page, STRUTHIO_ROW, 1)
    await expect(
      detailsOnlyRow.getByRole('cell', {
        name: IDENTIFICATION_DETAILS_VALUE,
        exact: true
      })
    ).toBeVisible()
    await expect(
      detailsOnlyRow.getByRole('button', {
        name: copy.identification.removeRow
      })
    ).toBeVisible()
    await removeAnimalRow(page, STRUTHIO_ROW, 1)

    const descriptionOnlyCard = await saveSoleAnimalAndReopenCard(
      page,
      STRUTHIO_ROW,
      'description',
      DESCRIPTION_VALUE
    )
    await expect(descriptionOnlyCard.getByRole('columnheader')).toHaveText(
      fallbackSavedAnimalsHead
    )
    await expect(
      savedAnimalRow(page, STRUTHIO_ROW, 1).getByRole('cell', {
        name: DESCRIPTION_VALUE,
        exact: true
      })
    ).toBeVisible()
  })

  test('saves an identification details value of 58 characters', async ({
    page
  }) => {
    const atMax = 'D'.repeat(MAX_IDENTIFIER_LENGTH)

    await openIdentification(page, [[STRUTHIO_ROW]])
    const savedCard = await saveSoleAnimalAndReopenCard(
      page,
      STRUTHIO_ROW,
      'identificationDetails',
      atMax
    )

    await expect(
      savedAnimalRow(page, STRUTHIO_ROW, 1).getByRole('cell', {
        name: atMax,
        exact: true
      })
    ).toBeVisible()
    await expect(savedCard.getByRole('textbox')).toHaveCount(0)
  })

  test('reopening the page shows both saved values on the fallback card', async ({
    page
  }) => {
    await openIdentification(page, [[STRUTHIO_ROW]])
    await page
      .locator('#identificationDetails-0')
      .fill(IDENTIFICATION_DETAILS_VALUE)
    await page.locator('#description-0').fill(DESCRIPTION_VALUE)
    await saveAndContinue(page).click()

    await reopenIdentificationFromHub(page)
    const row = savedAnimalRow(page, STRUTHIO_ROW, 1)
    await expect(
      row.getByRole('cell', { name: IDENTIFICATION_DETAILS_VALUE, exact: true })
    ).toBeVisible()
    await expect(
      row.getByRole('cell', { name: DESCRIPTION_VALUE, exact: true })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations on a fallback panel', async ({
    page
  }) => {
    await openIdentification(page, [[STRUTHIO_ROW]])
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with the fallback identifiers'
    )
  })

  test('has no serious or critical axe violations in the fallback length-error state', async ({
    page
  }) => {
    await openIdentification(page, [[STRUTHIO_ROW]])
    await page
      .locator('#identificationDetails-0')
      .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
    await saveAndContinue(page).click()

    await expect(
      errorLink(
        page,
        copy.identification.errors.identifierMax.identificationDetails
      )
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a fallback length error'
    )
  })
})

test.describe('animal identification in-card save button', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('invites another record while more than one animal is outstanding, then finishes the line on the last', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toBeVisible()

    await addBosTaurusRecord(page, 'UK000000000001')

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          2,
          2
        )
      })
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndFinish)
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toHaveCount(0)

    await addBosTaurusRecord(page, 'UK000000000002', { last: true })
    await expectCompleteCard(page, BOS_TAURUS_ROW, 2)
  })

  test('offers no in-card button on a line of one animal and saves it on Save and continue', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '1']])
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          1,
          1
        )
      })
    ).toBeVisible()
    await expect(
      inCardSaveButton(page, copy.identification.saveAndAddAnother)
    ).toHaveCount(0)
    await expect(
      inCardSaveButton(page, copy.identification.saveAndFinish)
    ).toHaveCount(0)

    await page.locator(EAR_TAG_FIELD).fill('UK000000000001')
    await saveAndContinue(page).click()

    await reopenIdentificationFromHub(page)
    await expect(
      savedAnimalRow(page, BOS_TAURUS_ROW, 1).getByRole('cell', {
        name: 'UK000000000001',
        exact: true
      })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations on the last outstanding animal', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await addBosTaurusRecord(page, 'UK000000000001')
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

  test('heads the summary with the code, species and number of animals', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])

    await expect(
      selectedCommoditiesSummary(page).getByRole('columnheader')
    ).toHaveText([
      copy.selectedCommodities.commodityCode,
      copy.selectedCommodities.species,
      copy.selectedCommodities.numberOfAnimals,
      copy.selectedCommodities.actionsHidden
    ])
  })

  test('sums two 0102 species into one row and gives each species on code 01061900 its own row', async ({
    page
  }) => {
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '2'],
      [BISON_BISON_ROW, '3'],
      [FELIS_CATUS_ROW, '4']
    ])
    const summary = selectedCommoditiesSummary(page)

    await expectSummaryRow(summary, {
      code: BOS_TAURUS_ROW.commodityCode,
      labels: [
        labelFor(BISON_BISON_ROW.speciesLatinName),
        labelFor(BOS_TAURUS_ROW.speciesLatinName)
      ],
      animals: '5'
    })
    await expectSummaryRow(summary, {
      code: FELIS_CATUS_ROW.commodityCode,
      labels: [labelFor(FELIS_CATUS_ROW.speciesLatinName)],
      animals: '4'
    })
    await expect(
      summary.or(commodityHeading(page, BOS_TAURUS_CODE_HEADING))
    ).toContainText([copy.selectedCommodities.caption, BOS_TAURUS_CODE_HEADING])
  })

  test('changes the commodity list from a summary row', async ({ page }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await selectedCommoditiesSummary(page)
      .getByRole('link', {
        name: `${copy.identification.summary.change} ${BOS_TAURUS_ROW.commodityCode} ${labelFor(BOS_TAURUS_ROW.speciesLatinName)}`
      })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })

  test('Add another commodity opens What are you importing?, and saving a further species returns to identification details', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await page
      .getByRole('link', { name: copy.identification.addAnotherCommodity })
      .click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()

    await selectSpecies(page, [FELIS_CATUS_ROW])
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(
      new RegExp(`/notifications/[^/]+/${LANDINGS.animalIdentification.slug}`)
    )
    await expect(
      page.getByRole('heading', {
        name: LANDINGS.animalIdentification.title,
        exact: true
      })
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
    await openFelisCatusIdentification(page)
    await submitAdd(page)

    await expectErrorFocus(
      page,
      copy.identification.errors.atLeastOneIdentifier,
      page.locator(MICROCHIP_FIELD)
    )
    await expect(page.locator(MICROCHIP_FIELD)).toHaveValue('')
  })

  test('validation: a blank card is refused on its own Save and add another, beside a filled sibling card, saving neither', async ({
    page
  }) => {
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '2'],
      [BISON_BISON_ROW, '2']
    ])
    const bosTaurusCard = speciesCard(page, BOS_TAURUS_ROW)
    const bisonBisonCard = speciesCard(page, BISON_BISON_ROW)
    const earTagLabel =
      copy.identification.identifierLabels.animalIdentifierEarTag
    const bosTaurusEarTag = bosTaurusCard.getByLabel(earTagLabel, {
      exact: true
    })
    const bisonEarTag = bisonBisonCard.getByLabel(earTagLabel, { exact: true })
    await bosTaurusEarTag.fill('UK000000000001')
    await bisonBisonCard
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()

    await expectErrorFocus(
      page,
      copy.identification.errors.atLeastOneIdentifier,
      bisonEarTag
    )
    await expect(savedAnimalRow(page, BISON_BISON_ROW, 1)).toHaveCount(0)
    await expect(savedAnimalRow(page, BOS_TAURUS_ROW, 1)).toHaveCount(0)
    await expect(bosTaurusEarTag).toHaveValue('')
  })

  test('validation: Save and return to overview with every identifier blank shows no error and goes to the overview', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW]])
    await saveAndReturnToHub(page).click()

    await expectOverview(page)
    await expect(page.locator(ERROR_SUMMARY_SELECTOR)).toHaveCount(0)
  })

  for (const [species, field, label] of identifierValidations) {
    test(`validation: ${label} over ${MAX_IDENTIFIER_LENGTH} characters for ${labelFor(species.speciesLatinName)} links to and focuses the preserved value`, async ({
      page
    }) => {
      await openIdentification(page, [[species]])
      const invalid = 'X'.repeat(MAX_IDENTIFIER_LENGTH + 1)
      await page.locator(`#${field}-0`).fill(invalid)
      await saveAndContinue(page).click()

      await expectErrorFocus(
        page,
        copy.identification.errors.identifierMax[field],
        page.locator(`#${field}-0`)
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

test.describe('animal identification records', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('lists a saved cat record in its card, headed by the animal column, its three identifiers and the remove action', async ({
    page
  }) => {
    const row = await addFelisCatusRecordRow(page)

    const card = speciesCard(page, FELIS_CATUS_ROW)
    await expect(card.getByRole('columnheader')).toHaveText(
      PET_CODE_COLUMN_HEADINGS
    )
    await expect(
      row.getByRole('cell', { name: MICROCHIP_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      row.getByRole('cell', { name: PASSPORT_NUMBER, exact: true })
    ).toBeVisible()
  })

  test('heads the table with every identifier asked of the species, not only the ones a saved record filled in', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await addBosTaurusRecord(page, 'UK000000000001')

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
      columnHeader(
        page,
        copy.identification.identifierLabels.animalIdentifierTattoo
      )
    ).toBeVisible()
    await expect(
      savedAnimalRow(page, BOS_TAURUS_ROW, 1).getByRole('cell', {
        name: 'UK000000000001',
        exact: true
      })
    ).toBeVisible()
  })

  test("saves a Mustela putorius furo identified only by its microchip, heads its table with the animal column, its three identifiers and the remove action, moves the card on to the line's second animal and reads the number back", async ({
    page
  }) => {
    await openIdentification(page, [[MUSTELA_PUTORIUS_FURO_ROW, '2']])
    await page.locator(MICROCHIP_FIELD).fill(MICROCHIP_NUMBER)
    await submitAdd(page)

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(
          labelFor(MUSTELA_PUTORIUS_FURO_ROW.speciesLatinName),
          2,
          2
        )
      })
    ).toBeVisible()
    const card = speciesCard(page, MUSTELA_PUTORIUS_FURO_ROW)
    await expect(card.getByRole('columnheader')).toHaveText(
      PET_CODE_COLUMN_HEADINGS
    )
    await page.reload()
    await expect(
      savedAnimalRow(page, MUSTELA_PUTORIUS_FURO_ROW, 1).getByRole('cell', {
        name: MICROCHIP_NUMBER,
        exact: true
      })
    ).toBeVisible()
  })

  test('removes an added record', async ({ page }) => {
    await addFelisCatusRecordRow(page)
    const row = await removeAnimalRow(page, FELIS_CATUS_ROW, 1)
    await expect(row).toHaveCount(0)
  })

  test('has no serious or critical axe violations once an animal is saved', async ({
    page
  }) => {
    const row = await addFelisCatusRecordRow(page)
    await expect(row).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Animal identification with a saved animal'
    )
  })

  test('rejects a stale add action after the animal-count cap is reached', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])
    await addBosTaurusRecord(page, 'UK000000000001')
    await addBosTaurusRecord(page, 'UK000000000002', { last: true })
    await expectCompleteCard(page, BOS_TAURUS_ROW, 2)

    await submitStaleAdd(page)

    const link = errorLink(page, copy.identification.errors.capReached(2))
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/#identification-card-0(?:\?from=[^#]*)?$/)
  })

  test('blocks a count drop below saved records and reopens after removal', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          1,
          2
        )
      })
    ).toBeVisible()
    await addBosTaurusRecord(page, 'UK000000000001')
    await addBosTaurusRecord(page, 'UK000000000002', { last: true })
    await expectCompleteCard(page, BOS_TAURUS_ROW, 2)
    await expect(page.locator(EAR_TAG_FIELD)).toHaveCount(0)

    await saveAndReturnToHub(page).click()
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await saveAndReturnToHub(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', {
        name: hubCopy.rows.consignmentDetails.title,
        exact: true
      })
      .click()
    await page.locator('#numberOfAnimalsQuantity-0').fill('1')
    await saveAndContinue(page).click()
    const countDrop = copy.consignmentDetails.errors.countDrop(
      2,
      labelFor(BOS_TAURUS_ROW.speciesLatinName),
      1
    )
    await expect(errorLink(page, countDrop)).toBeVisible()
    await errorLink(page, countDrop).click()
    await expect(page).toHaveURL(/#identification-card-0(?:\?from=[^#]*)?$/)
    await expect(
      commodityHeading(page, BOS_TAURUS_CODE_HEADING)
        .locator('xpath=following::*[@id="identification-card-0"]')
        .first()
    ).toBeVisible()

    await removeAnimalRow(page, BOS_TAURUS_ROW, 2)
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          2,
          2
        )
      })
    ).toBeVisible()
  })
})

test.describe('animal identification keyboard behaviour across two saved panels', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('appends a new animal to the Bos taurus table when Enter is pressed in its field, leaving the Bison bison table unchanged', async ({
    page
  }) => {
    await openBosTaurusAndBisonBisonEachWithOneSaved(page, '2')

    const bosTaurusEarTag = earTagFieldOf(page, BOS_TAURUS_ROW)
    await bosTaurusEarTag.fill('UK000000000003')
    await bosTaurusEarTag.press('Enter')

    await expectCompleteCard(page, BOS_TAURUS_ROW, 2)
    await expect(savedAnimalRow(page, BOS_TAURUS_ROW, 1)).toContainText(
      'UK000000000001'
    )
    await expect(savedAnimalRow(page, BOS_TAURUS_ROW, 2)).toContainText(
      'UK000000000003'
    )
    await expect(
      speciesCard(page, BISON_BISON_ROW)
        .getByRole('table')
        .locator('tbody')
        .getByRole('row')
    ).toHaveCount(1)
    await expect(savedAnimalRow(page, BISON_BISON_ROW, 1)).toContainText(
      'UK000000000002'
    )
    await expect(
      page.getByRole('heading', {
        name: copy.identification.title,
        exact: true
      })
    ).toBeVisible()
  })

  test("lists its own save button then its own first Remove button as the only controls in an open panel, and reaches them by tabbing forward from its last identifier field, never the Bos taurus card's controls", async ({
    page
  }) => {
    await openBosTaurusAndBisonBisonEachWithOneSaved(page, '2')
    const card = speciesCard(page, BISON_BISON_ROW)

    await expect(card.getByRole('button')).toHaveText([
      copy.identification.saveAndFinish,
      new RegExp(`^${copy.identification.removeRow}`)
    ])

    await card.getByRole('textbox').last().focus()
    await page.keyboard.press('Tab')
    await expect(
      saveButtonOf(page, BISON_BISON_ROW, copy.identification.saveAndFinish)
    ).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(
      card
        .getByRole('button', {
          name: new RegExp(`^${copy.identification.removeRow}`)
        })
        .first()
    ).toBeFocused()
  })
})

test.describe('animal identification sections and species cards', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('groups a commodity code into a section headed by the code holding one card per species with Bison bison above Bos taurus', async ({
    page
  }) => {
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '3'],
      [BISON_BISON_ROW, '2']
    ])

    await expect(commodityHeading(page, BOS_TAURUS_CODE_HEADING)).toBeVisible()
    await expect(page.locator('main h1, main h2, main h3, main h4')).toHaveText(
      [
        copy.identification.title,
        BOS_TAURUS_CODE_HEADING,
        labelFor(BISON_BISON_ROW.speciesLatinName),
        copy.identification.counter(
          labelFor(BISON_BISON_ROW.speciesLatinName),
          1,
          2
        ),
        labelFor(BOS_TAURUS_ROW.speciesLatinName),
        copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          1,
          3
        )
      ]
    )
  })

  test('puts the entry form and its button above the saved animals while animals remain', async ({
    page
  }) => {
    await openIdentification(page, [[BOS_TAURUS_ROW, '3']])
    await addBosTaurusRecord(page, 'UK000000000001')

    const card = speciesCard(page, BOS_TAURUS_ROW)
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
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])

    const primaryButtonBackgroundColour = await saveAndContinue(page).evaluate(
      (button) => getComputedStyle(button).backgroundColor
    )

    await expect(
      page.getByRole('button', { name: copy.identification.saveAndAddAnother })
    ).toHaveCSS('background-color', primaryButtonBackgroundColour)
  })

  test('labels the identifier fields in regular weight with no hint', async ({
    page
  }) => {
    await openIdentification(page, [[FELIS_CATUS_ROW, '2']])

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
    await openIdentification(page, [[BOS_TAURUS_ROW, '2']])

    await expect(
      withinTwoThirdsColumn(
        page.getByRole('heading', { name: copy.identification.title })
      )
    ).toHaveCount(1)
    await expect(
      withinTwoThirdsColumn(page.getByText(copy.identification.inset))
    ).toHaveCount(1)
    const card = speciesCard(page, BOS_TAURUS_ROW)
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
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '2'],
      [FELIS_CATUS_ROW, '1']
    ])
    await addBosTaurusRecord(page, 'UK000000000001')
    await addBosTaurusRecord(page, 'UK000000000002', { last: true })
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

  test('keeps the summary and a Felis catus card with a saved animal inside the screen width', async ({
    page
  }) => {
    await openFelisCatusIdentification(page)
    await fillFelisCatusRecord(page)
    await submitAdd(page)

    await expectNoHorizontalOverflow(
      selectedCommoditiesSummary(page),
      'Selected commodities summary'
    )
    await expectNoHorizontalOverflow(
      speciesCard(page, FELIS_CATUS_ROW),
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
    await openIdentification(page, [
      [BOS_TAURUS_ROW, '2'],
      [BISON_BISON_ROW, '2']
    ])
    await page.locator(EAR_TAG_FIELD).fill('UK000000000001')
    await page
      .locator(SECOND_EAR_TAG_FIELD)
      .fill('X'.repeat(MAX_IDENTIFIER_LENGTH + 1))
    await speciesCard(page, BISON_BISON_ROW)
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()

    await expect(page.locator(ERROR_SUMMARY_SELECTOR)).toHaveCount(0)
    await expect(savedAnimalRow(page, BISON_BISON_ROW, 1)).toBeVisible()
    await expect(page.locator(EAR_TAG_FIELD)).toHaveValue('')
    await expect(page.locator(SECOND_EAR_TAG_FIELD)).toHaveValue('')
    await expect(
      speciesCard(page, BOS_TAURUS_ROW).getByRole('heading', {
        name: copy.identification.counter(
          labelFor(BOS_TAURUS_ROW.speciesLatinName),
          1,
          2
        ),
        exact: true
      })
    ).toBeVisible()
    await expect(
      speciesCard(page, BOS_TAURUS_ROW).getByRole('table')
    ).toHaveCount(0)
  })
})
