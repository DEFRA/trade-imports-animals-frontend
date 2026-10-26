import { SET_BASE, SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  expectNoRefusalLogged,
  expectOneRefusalLogged,
  expectRemovalRefusedLogged,
  journeyRequest,
  postHandlerOf,
  crumbProtectedServerMounting,
  stubH
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { dispatchPages } from '../../index.js'
import { consignmentDetailsPage } from '../page.js'

import {
  BISON_BISON,
  BISON_BISON_ROW,
  BOS_TAURUS,
  BOS_TAURUS_ROW,
  EQUUS_CABALUS,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS,
  FELIS_CATUS_ROW,
  STRUTHIO,
  STRUTHIO_ROW,
  lineOf
} from '../search/test-support.js'

import * as animalIdentification from './animal-identification.controller.js'

const post = postHandlerOf(animalIdentification)
const getHandler = animalIdentification.routes.find(
  (route) => route.method === 'GET'
).handler

const MICROCHIP_FIELD_0 = 'animalIdentifierMicrochip-0'
const PASSPORT_FIELD_0 = 'animalIdentifierPassport-0'
const TATTOO_FIELD_0 = 'animalIdentifierTattoo-0'
const EAR_TAG_FIELD_0 = 'animalIdentifierEarTag-0'
const EAR_TAG_FIELD_1 = 'animalIdentifierEarTag-1'
const IDENTIFICATION_PAGE = 'commodities/identification'
const REMOVE_FIRST_UNIT = 'remove:0:0'
const BOS_TAURUS_1 = 'Bos taurus 1'
const SAVE_AND_ADD_ANOTHER = 'Save and add another'
const CATTLE_HEADING = '0102'
const EAR_TAG_REFUSED = 'Ear tag must be 58 characters or less'

const felisCatusLine = (extra = {}) => lineOf(FELIS_CATUS_ROW, extra)

const bosTaurusLine = (extra = {}) => lineOf(BOS_TAURUS_ROW, extra)

const bisonBisonLine = (extra = {}) => lineOf(BISON_BISON_ROW, extra)

const equusLine = (extra = {}) => lineOf(EQUUS_CABALUS_ROW, extra)

const struthioLine = (extra = {}) => lineOf(STRUTHIO_ROW, extra)

const viewContext = async (seed) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = stubH()
  await getHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view.context
}

const viewCards = async (seed) =>
  (await viewContext(seed)).sections.flatMap((section) => section.cards)

const textsOf = (cells) => cells.map((cell) => cell.text)

const savedAnimalLabels = (card) =>
  card.savedAnimalsTable.rows.map(([animalCell]) => animalCell.text)

const savedIdentifierColumns = (card) =>
  textsOf(card.savedAnimalsTable.head.slice(1, -1))

const savedIdentifierCells = (card, unitIndex) =>
  textsOf(card.savedAnimalsTable.rows[unitIndex].slice(1, -1))

const HIDDEN_ANIMAL_1 = '<span class="govuk-visually-hidden"> animal 1</span>'

const firstRemoveCellHtml = (card) => card.savedAnimalsTable.rows[0].at(-1).html

const SUITE =
  '#animalIdentificationController — the single card-per-species surface'

const setupIdentificationEngine = () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())
}

describe(`${SUITE} — the cards view`, () => {
  setupIdentificationEngine()

  it('Should render one card per species line with the N-of-M counter driven by the declared count', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(card.title).toBe(BOS_TAURUS)
    expect(card.counter).toBe('Enter details for Bos taurus 2 of 2')
    expect(card.savedAnimalsTable.rows).toHaveLength(1)
    expect(savedAnimalLabels(card)[0]).toBe(BOS_TAURUS_1)
  })

  it('Should group the cards into one section per commodity code, headed by the code', async () => {
    const { sections } = await viewContext({
      commodityLines: [
        bosTaurusLine({ numberOfAnimalsQuantity: '2' }),
        bisonBisonLine({ numberOfAnimalsQuantity: '3' }),
        equusLine({ numberOfAnimalsQuantity: '1' })
      ]
    })
    expect(
      sections.map(({ heading, cards }) => [
        heading,
        cards.map((card) => card.title)
      ])
    ).toEqual([
      [CATTLE_HEADING, [BOS_TAURUS, BISON_BISON]],
      ['0101', [EQUUS_CABALUS]]
    ])
  })

  it('Should give a line with identifier fields and no number of animals no card while the summary still lists it', async () => {
    const context = await viewContext({ commodityLines: [felisCatusLine()] })
    expect(context.sections).toEqual([])
    expect(context.selectedCommodities).toEqual([
      {
        code: '01061900',
        latinNames: [FELIS_CATUS],
        animals: ''
      }
    ])
  })

  it('Should show only the commodity-gated fields per card — typed for Cats with the address, no fallbacks', async () => {
    const [card] = await viewCards({
      commodityLines: [felisCatusLine({ numberOfAnimalsQuantity: '2' })]
    })
    const labels = card.fields.map((field) => field.label)
    expect(labels).toEqual(['Microchip', 'Passport', 'Tattoo'])
    expect(card.showAddress).toBe(true)
    const ids = card.fields.map((field) => field.id)
    expect(ids).toEqual([MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0])
  })

  it("Should order each commodity's entry fields by that commodity's own identifier list", async () => {
    const [cow] = await viewCards({
      commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '2' })]
    })
    expect(cow.fields.map((field) => field.id)).toEqual([
      EAR_TAG_FIELD_0,
      PASSPORT_FIELD_0
    ])

    const [horse] = await viewCards({
      commodityLines: [equusLine({ numberOfAnimalsQuantity: '2' })]
    })
    expect(horse.fields.map((field) => field.label)).toEqual([
      'Microchip',
      'Passport',
      'Horse name'
    ])
  })

  it('Should leave only the saved animals on a card once every animal is entered', async () => {
    const [card] = await viewCards({
      commodityLines: [
        bosTaurusLine({
          numberOfAnimalsQuantity: '3',
          animalIdentifiers: [
            { animalIdentifierEarTag: 'UK1' },
            { animalIdentifierEarTag: 'UK2' },
            { animalIdentifierEarTag: 'UK3' }
          ]
        })
      ]
    })
    expect(card.counter).toBeNull()
    expect(card.fields).toEqual([])
    expect(card.saveButtonText).toBeNull()
    expect(card.overCountText).toBeNull()
    expect(card.savedAnimalsTable.rows).toHaveLength(3)
    expect(firstRemoveCellHtml(card)).toContain(HIDDEN_ANIMAL_1)
  })

  it('Should name the count mismatch when the declared number drops below the entered records', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [
            { animalIdentifierEarTag: 'UK1' },
            { animalIdentifierEarTag: 'UK2' }
          ]
        })
      ]
    })
    expect(card.counter).toBeNull()
    expect(card.overCountText).toBe(
      'This commodity line lists 1 Bos taurus animals but you have entered details for 2. Remove 1 to continue.'
    )
    expect(card.savedAnimalsTable.rows).toHaveLength(2)
    expect(firstRemoveCellHtml(card)).toContain(HIDDEN_ANIMAL_1)
  })
})

describe(`${SUITE} — the in-card save button`, () => {
  setupIdentificationEngine()

  it('Should invite another record while more than one animal is still outstanding', async () => {
    const [card] = await viewCards({
      commodityLines: [lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '3' })]
    })
    expect(card.saveButtonText).toBe(SAVE_AND_ADD_ANOTHER)
  })

  it('Should keep inviting another record when a saved line still has more than one animal outstanding', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '3',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(card.counter).toBe('Enter details for Bos taurus 2 of 3')
    expect(card.saveButtonText).toBe(SAVE_AND_ADD_ANOTHER)
  })

  it('Should finish the line on the last outstanding animal rather than inviting another', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(card.counter).toBe('Enter details for Bos taurus 2 of 2')
    expect(card.saveButtonText).toBe('Save and finish')
  })

  it('Should offer no in-card button on a line of one animal', async () => {
    const [card] = await viewCards({
      commodityLines: [lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '1' })]
    })
    expect(card.counter).toBe('Enter details for Bos taurus 1 of 1')
    expect(card.saveButtonText).toBeNull()
  })

  it('Should drop the button with the rest of the entry block once every animal is entered', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            { animalIdentifierEarTag: 'UK1' },
            { animalIdentifierEarTag: 'UK2' }
          ]
        })
      ]
    })
    expect(card.counter).toBeNull()
    expect(card.saveButtonText).toBeNull()
  })

  it('Should still capture a one-animal record through the page primary', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '1' })
        ]
      },
      payload: { 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    expect(
      result.after.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK1')
  })
})

describe(`${SUITE} — the Selected commodities summary`, () => {
  setupIdentificationEngine()

  it('Should summarise each commodity code with every Latin name and the total declared count', async () => {
    const context = await viewContext({
      commodityLines: [
        bosTaurusLine({ numberOfAnimalsQuantity: '2' }),
        bisonBisonLine({ numberOfAnimalsQuantity: '5' }),
        equusLine({ numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.selectedCommodities).toEqual([
      {
        code: '0102',
        latinNames: [BOS_TAURUS, BISON_BISON],
        animals: '7'
      },
      {
        code: '0101',
        latinNames: [EQUUS_CABALUS],
        animals: '3'
      }
    ])
  })

  it('Should offer the route back to the commodity question alongside the cards', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      commodityLines: [felisCatusLine({ numberOfAnimalsQuantity: '2' })]
    })
    const h = stubH()
    await getHandler(journeyRequest(journey.journeyId), h)
    const { addHref } = h.captured.view.context

    expect(addHref).toBe(pagePath(journey.journeyId, 'commodities'))
  })

  it('Should point every card at the consignment-details page to change the animal count', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '2' }),
        lineOf(FELIS_CATUS_ROW, { numberOfAnimalsQuantity: '3' })
      ]
    })
    const h = stubH()
    await getHandler(journeyRequest(journey.journeyId), h)
    const cards = h.captured.view.context.sections.flatMap(
      (section) => section.cards
    )

    expect(cards.map((card) => card.changeCountHref)).toEqual([
      pagePath(journey.journeyId, 'consignment-details'),
      pagePath(journey.journeyId, 'consignment-details')
    ])
  })

  it('Should keep the change context on every card link when the trader arrived from check your answers', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '2' }),
        lineOf(FELIS_CATUS_ROW, { numberOfAnimalsQuantity: '3' })
      ]
    })
    const h = stubH()
    await getHandler(
      journeyRequest(journey.journeyId, { query: { change: '1' } }),
      h
    )
    const cards = h.captured.view.context.sections.flatMap(
      (section) => section.cards
    )

    const expected = `${pagePath(journey.journeyId, consignmentDetailsPage.slug)}?change=1`
    expect(cards.map((card) => card.changeCountHref)).toEqual([
      expected,
      expected
    ])
  })
})

describe(`${SUITE} — the saved-animals table`, () => {
  setupIdentificationEngine()

  it('Should head the table with every identifier the commodity declares, not only the ones filled in', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(savedIdentifierColumns(card)).toEqual(['Ear tag', 'Passport'])
    expect(savedIdentifierCells(card, 0)).toEqual(['UK1', ''])
  })

  it('Should number the rows within a commodity line by the species and the row position', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            { animalIdentifierEarTag: 'UK1' },
            { animalIdentifierPassport: 'UK2' }
          ]
        })
      ]
    })
    expect(savedAnimalLabels(card)).toEqual([BOS_TAURUS_1, 'Bos taurus 2'])
    expect(savedIdentifierCells(card, 1)).toEqual(['', 'UK2'])
  })

  it('Should key each row by its own line\'s species so two commodity lines do not both start at "Animal 1"', async () => {
    const cards = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }),
        lineOf(FELIS_CATUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK2' }]
        })
      ]
    })
    expect(cards).toHaveLength(2)
    expect(savedAnimalLabels(cards[0])).toEqual([BOS_TAURUS_1])
    expect(savedAnimalLabels(cards[1])).toEqual(['Felis catus 1'])
  })

  it('Should fall back to the positional label when the line names no species', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          speciesLatinName: '',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(savedAnimalLabels(card)[0]).toBe('Animal 1')
  })

  it('Should give the permanent address its own column where the code and species require one', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(FELIS_CATUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            {
              animalIdentifierPassport: 'UK123456789',
              permanentAddress: { name: 'Pet Owner' }
            }
          ]
        })
      ]
    })
    expect(savedIdentifierColumns(card)).toEqual([
      'Microchip',
      'Passport',
      'Tattoo',
      'Permanent address'
    ])
    expect(savedIdentifierCells(card, 0)).toEqual([
      '',
      'UK123456789',
      '',
      'Pet Owner'
    ])
  })

  it('Should head a horse line with the three identifiers it carries and no permanent address', async () => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(EQUUS_CABALUS_ROW, {
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ horseName: 'Shergar' }]
        })
      ]
    })
    expect(savedIdentifierColumns(card)).toEqual([
      'Microchip',
      'Passport',
      'Horse name'
    ])
    expect(savedIdentifierCells(card, 0)).toEqual(['', '', 'Shergar'])
  })
})

describe(`${SUITE} — Save and add another`, () => {
  setupIdentificationEngine()

  it("Should append the card's record and stay on the surface with the PRG redirect", async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '2' })
        ]
      },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, IDENTIFICATION_PAGE)
    })
    const [unit] = result.after.commodityLines[0].animalIdentifiers
    expect(unit.animalIdentifierEarTag).toBe('UK1')
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should reject an empty Save and add another — never append a blank record, and log nothing', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '2' })]
      },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': '' }
    })
    expect(result.view.context.errors[EAR_TAG_FIELD_0]).toBe(
      'Enter at least one identifier for this animal'
    )
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.after.commodityLines[0].animalIdentifiers).toBeUndefined()
    expectNoRefusalLogged(result.logger)
  })

  it('Should surface the engine cap rejection as a card-level error when a stale form posts once every animal is entered, and log the refusal', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, {
            numberOfAnimalsQuantity: '1',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          })
        ]
      },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK2' }
    })
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    const { errorSummary } = result.view.context
    expect(errorSummary.errorList).toHaveLength(1)
    expect(errorSummary.errorList[0].href).toBe('#identification-card-0')
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: [],
      reason: 'animal-identifier-cap-reached',
      lineIndex: 0,
      cap: 1
    })
  })

  it('Should block a partial permanent address on the pressed card', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [felisCatusLine({ numberOfAnimalsQuantity: '2' })]
      },
      payload: {
        action: 'add:0',
        [PASSPORT_FIELD_0]: 'UK123456789',
        'nameOrOrganisationName-0': 'Pet Owner'
      }
    })
    expect(result.view.context.errors['addressLine1-0']).toBe(
      'Enter address line 1'
    )
    expect(result.after.commodityLines[0].animalIdentifiers).toBeUndefined()
  })

  it("Should save only the pressed card's animal and show no error for another species' over-long value", async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          bosTaurusLine({ numberOfAnimalsQuantity: '2' }),
          bisonBisonLine({ numberOfAnimalsQuantity: '2' })
        ]
      },
      payload: {
        action: 'add:0',
        [EAR_TAG_FIELD_0]: 'UK1',
        [EAR_TAG_FIELD_1]: 'x'.repeat(59)
      }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, IDENTIFICATION_PAGE)
    })
    expect(
      result.after.commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierEarTag
      )
    ).toEqual(['UK1'])
    expect(result.after.commodityLines[1].animalIdentifiers).toBeUndefined()
  })

  it('Should save a 58-character identifier typed with spaces around it without them', async () => {
    const identifier = 'x'.repeat(58)
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '2' })]
      },
      payload: { action: 'add:0', [EAR_TAG_FIELD_0]: `  ${identifier}  ` }
    })
    expect(
      result.after.commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierEarTag
      )
    ).toEqual([identifier])
  })

  it('Should refuse a 59-character identifier with the field-named message', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '2' })]
      },
      payload: { action: 'add:0', [EAR_TAG_FIELD_0]: 'x'.repeat(59) }
    })
    expect(result.view.context.errors[EAR_TAG_FIELD_0]).toBe(EAR_TAG_REFUSED)
    expect(result.after.commodityLines[0].animalIdentifiers).toBeUndefined()
  })
})

describe(`${SUITE} — Save and continue`, () => {
  setupIdentificationEngine()

  it('Should append the held record of a one-animal line then exit along the section flow to the hub', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '1' })]
      },
      payload: { 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({
      redirect: hubPath(result.journeyId)
    })
    const [unit] = result.after.commodityLines[0].animalIdentifiers
    expect(unit.animalIdentifierEarTag).toBe('UK1')
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should exit without appending when no form holds data — the zero-record pass', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '1' })]
      },
      payload: {}
    })
    expect(result.response).toEqual({
      redirect: hubPath(result.journeyId)
    })
    expect(result.after).toEqual({
      commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: 1 })]
    })
  })

  it('Should save the one-animal line and leave a multi-animal line unsaved when both hold typed values', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          bosTaurusLine({ numberOfAnimalsQuantity: '1' }),
          felisCatusLine({ numberOfAnimalsQuantity: '2' })
        ]
      },
      payload: {
        'animalIdentifierEarTag-0': 'UK1',
        'animalIdentifierPassport-1': 'UK123456789'
      }
    })
    expect(
      result.after.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK1')
    expect(result.after.commodityLines[1].animalIdentifiers).toBeUndefined()
  })

  it('Should show no error for an over-long value typed into a multi-animal line', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [bosTaurusLine({ numberOfAnimalsQuantity: '2' })]
      },
      payload: { 'animalIdentifierEarTag-0': 'x'.repeat(59) }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })
})

describe(`${SUITE} — Implicit submit — Enter mid-entry fires the safe default, never a remove`, () => {
  setupIdentificationEngine()

  it('Should keep existing records and save nothing typed into a multi-animal line', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, {
            numberOfAnimalsQuantity: '3',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          })
        ]
      },
      payload: { action: 'finish', 'animalIdentifierEarTag-0': 'UK2' }
    })
    expect(result.response).toEqual({
      redirect: hubPath(result.journeyId)
    })
    const tags = result.after.commodityLines[0].animalIdentifiers.map(
      (unit) => unit.animalIdentifierEarTag
    )
    expect(tags).toEqual(['UK1'])
  })
})

describe(`${SUITE} — Remove`, () => {
  setupIdentificationEngine()

  it('Should remove the named record on the remove POST and return to the surface — a freed slot reopens the entry form', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, {
            numberOfAnimalsQuantity: '1',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          })
        ]
      },
      payload: { action: REMOVE_FIRST_UNIT }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, IDENTIFICATION_PAGE)
    })
    expect(result.after.commodityLines[0].animalIdentifiers).toBeUndefined()
  })

  it('Should refuse a remove for an out-of-range line index and delete nothing', async () => {
    const seed = {
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:5:0' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      lineIndex: 5,
      unitIndex: 0,
      reason: 'no-animal-identifier-at-index'
    })
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a remove for an out-of-range unit index and delete nothing', async () => {
    const seed = {
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, {
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:0:5' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      lineIndex: 0,
      unitIndex: 5,
      reason: 'no-animal-identifier-at-index'
    })
    expect(result.after).toEqual(seed)
  })

  it('Should reject a remove POST carrying no CSRF crumb and serve no GET route that removes', async () => {
    const server = await crumbProtectedServerMounting(
      animalIdentification.routes,
      SET_BASE
    )

    const forged = await server.inject({
      method: 'POST',
      url: pagePath('journey-1', IDENTIFICATION_PAGE),
      payload: { action: REMOVE_FIRST_UNIT }
    })
    expect(forged.statusCode).toBe(403)

    const prefetched = await server.inject({
      method: 'GET',
      url: pagePath('journey-1', 'commodities/identification/0/0/remove')
    })
    expect(prefetched.statusCode).toBe(404)
  })
})

describe(`${SUITE} — identifier render matrix — model metadata per commodity code`, () => {
  setupIdentificationEngine()

  const renderFor = async (commodityCode, speciesLatinName) => {
    const [card] = await viewCards({
      commodityLines: [
        lineOf(
          { commodityCode, speciesLatinName },
          { numberOfAnimalsQuantity: '2' }
        )
      ]
    })
    return {
      fieldIds: card.fields.map((field) => field.id),
      showAddress: card.showAddress,
      columnHeadings: card.savedAnimalsTable.head.map(({ text }) => text)
    }
  }

  const MATRIX = [
    {
      commodityCode: '0102',
      speciesLatinName: BOS_TAURUS,
      fieldIds: [EAR_TAG_FIELD_0, PASSPORT_FIELD_0],
      showAddress: false
    },
    {
      commodityCode: '0101',
      speciesLatinName: EQUUS_CABALUS,
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, 'horseName-0'],
      showAddress: false
    },
    {
      commodityCode: '01061900',
      speciesLatinName: 'Felis catus',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
      showAddress: true
    },
    {
      commodityCode: '01061900',
      speciesLatinName: 'Canis familiaris',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
      showAddress: true
    },
    {
      commodityCode: '01061900',
      speciesLatinName: 'Oryctolagus cuniculus',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
      showAddress: false
    }
  ]

  it.each(MATRIX)(
    'Should render $fieldIds for $commodityCode $speciesLatinName, permanent address $showAddress',
    async ({ commodityCode, speciesLatinName, fieldIds, showAddress }) => {
      const rendered = await renderFor(commodityCode, speciesLatinName)
      expect(rendered.fieldIds).toEqual(fieldIds)
      expect(rendered.showAddress).toBe(showAddress)
      expect(rendered.columnHeadings.includes('Permanent address')).toBe(
        showAddress
      )
    }
  )
})

describe(`${SUITE} — a commodity that carries no identifier of its own`, () => {
  setupIdentificationEngine()

  const requestPage = async (seed) => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, seed)
    const h = stubH()
    const response = await getHandler(journeyRequest(journey.journeyId), h)
    return { journeyId: journey.journeyId, response, view: h.captured.view }
  }

  it('Should give an ostrich line no card but keep it in the summary', async () => {
    const context = await viewContext({
      commodityLines: [
        lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '2' }),
        lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.sections.map((section) => section.heading)).toEqual([
      CATTLE_HEADING
    ])
    expect(context.selectedCommodities).toEqual([
      {
        code: '0102',
        latinNames: [BOS_TAURUS],
        animals: '2'
      },
      {
        code: '01063300',
        latinNames: [STRUTHIO],
        animals: '3'
      }
    ])
  })

  it('Should keep a surviving card on its own commodity-line index when an earlier line is filtered out', async () => {
    const context = await viewContext({
      commodityLines: [
        lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' }),
        lineOf(BOS_TAURUS_ROW, { numberOfAnimalsQuantity: '2' })
      ]
    })
    const cards = context.sections.flatMap((section) => section.cards)
    expect(cards).toHaveLength(1)
    expect(cards[0].index).toBe(1)
    expect(cards[0].anchor).toBe('identification-card-1')
    expect(cards[0].fields.map((field) => field.id)).toEqual([
      'animalIdentifierEarTag-1',
      'animalIdentifierPassport-1'
    ])
  })

  it('Should carry a request for the page on when no line carries an identifier', async () => {
    const { journeyId, response, view } = await requestPage({
      commodityLines: [lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' })]
    })
    expect(view).toBeUndefined()
    expect(response).toEqual({ redirect: hubPath(journeyId) })
  })

  it('Should carry a request for the page on when the notification has no commodities', async () => {
    const { journeyId, response, view } = await requestPage({
      commodityLines: []
    })
    expect(view).toBeUndefined()
    expect(response).toEqual({ redirect: hubPath(journeyId) })
  })

  const untouchedStruthioAnswers = {
    commodityLines: [struthioLine({ numberOfAnimalsQuantity: 3 })]
  }

  it('Should carry a stale add post on without writing a record, logging the skip once', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' })]
      },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after).toEqual(untouchedStruthioAnswers)
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, commodityCodes: ['01063300'] },
        message:
          'Animal identification skipped: nothing on the consignment carries an identifier'
      }
    ])
  })

  it('Should carry a stale remove post on without deleting a record', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' })]
      },
      payload: { action: REMOVE_FIRST_UNIT }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after).toEqual(untouchedStruthioAnswers)
  })
})
