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
  journeyRequest,
  postHandlerOf,
  crumbProtectedServerMounting,
  stubH
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { consignmentDetailsPage } from '../page.js'

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
const BOS_TAURUS = 'Bos taurus'
const BOS_TAURUS_1 = 'Bos taurus 1'
const SAVE_AND_ADD_ANOTHER = 'Save and add another'
const COW_HEADING = 'Cow (0102)'
const EAR_TAG_REFUSED = 'Ear tag must be 58 characters or less'

const catLine = (extra = {}) => ({
  commoditySelection: 'Cat',
  speciesSelection: '923501',
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})

const cowLine = (extra = {}) => ({
  commoditySelection: 'Cow',
  speciesSelection: '1148346',
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})

const bisonLine = (extra = {}) =>
  cowLine({ speciesSelection: '716661', ...extra })

const horseLine = (extra = {}) => ({
  commoditySelection: 'Horse',
  speciesSelection: '822332',
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})

const fishLine = (extra = {}) => ({
  commoditySelection: 'Fish',
  speciesSelection: '801204',
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})

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
  textsOf(card.savedAnimalsTable.head.slice(1))

const savedIdentifierCells = (card, unitIndex) =>
  textsOf(card.savedAnimalsTable.rows[unitIndex].slice(1))

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
        cowLine({
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(card.title).toBe(BOS_TAURUS)
    expect(card.counter).toBe('Enter details for Bos taurus 2 of 2')
    expect(card.units).toHaveLength(1)
    expect(savedAnimalLabels(card)[0]).toBe(BOS_TAURUS_1)
  })

  it('Should group the cards into one section per commodity, headed by its name and code', async () => {
    const { sections } = await viewContext({
      commodityLines: [
        cowLine({ numberOfAnimalsQuantity: '2' }),
        bisonLine({ numberOfAnimalsQuantity: '3' }),
        horseLine({ numberOfAnimalsQuantity: '1' })
      ]
    })
    expect(
      sections.map(({ heading, cards }) => [
        heading,
        cards.map((card) => card.title)
      ])
    ).toEqual([
      [COW_HEADING, [BOS_TAURUS, 'Bison bison']],
      ['Horse (0101)', ['Equus caballus']]
    ])
  })

  it('Should give a line with identifier fields and no number of animals no card while the summary still lists it', async () => {
    const context = await viewContext({ commodityLines: [catLine()] })
    expect(context.sections).toEqual([])
    expect(context.selectedCommodities).toEqual([
      {
        code: '01061900',
        name: 'Cat',
        latinNames: ['Felis catus'],
        animals: ''
      }
    ])
  })

  it('Should show only the commodity-gated fields per card — typed for Cats with the address, no fallbacks', async () => {
    const [card] = await viewCards({
      commodityLines: [catLine({ numberOfAnimalsQuantity: '2' })]
    })
    const labels = card.fields.map((field) => field.label)
    expect(labels).toEqual(['Microchip', 'Passport', 'Tattoo'])
    expect(card.showAddress).toBe(true)
    const ids = card.fields.map((field) => field.id)
    expect(ids).toEqual([MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0])
  })

  it("Should order each commodity's entry fields by that commodity's own identifier list", async () => {
    const [cow] = await viewCards({
      commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })]
    })
    expect(cow.fields.map((field) => field.id)).toEqual([
      EAR_TAG_FIELD_0,
      PASSPORT_FIELD_0
    ])

    const [horse] = await viewCards({
      commodityLines: [horseLine({ numberOfAnimalsQuantity: '2' })]
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
        cowLine({
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
    expect(card.units).toHaveLength(3)
    expect(card.units[0].removeAria).toBe('animal 1')
  })

  it('Should name the count mismatch when the declared number drops below the entered records', async () => {
    const [card] = await viewCards({
      commodityLines: [
        cowLine({
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
    expect(card.units).toHaveLength(2)
    expect(card.units[0].removeAria).toBe('animal 1')
  })
})

describe(`${SUITE} — the in-card save button`, () => {
  setupIdentificationEngine()

  it('Should invite another record while more than one animal is still outstanding', async () => {
    const [card] = await viewCards({
      commodityLines: [cowLine({ numberOfAnimalsQuantity: '3' })]
    })
    expect(card.saveButtonText).toBe(SAVE_AND_ADD_ANOTHER)
  })

  it('Should keep inviting another record when a saved line still has more than one animal outstanding', async () => {
    const [card] = await viewCards({
      commodityLines: [
        cowLine({
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
        cowLine({
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
      commodityLines: [cowLine({ numberOfAnimalsQuantity: '1' })]
    })
    expect(card.counter).toBe('Enter details for Bos taurus 1 of 1')
    expect(card.saveButtonText).toBeNull()
  })

  it('Should drop the button with the rest of the entry block once every animal is entered', async () => {
    const [card] = await viewCards({
      commodityLines: [
        cowLine({
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
        commodityLines: [cowLine({ numberOfAnimalsQuantity: '1' })]
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

  it('Should summarise each commodity with its code, name, every Latin name and the total declared count', async () => {
    const context = await viewContext({
      commodityLines: [
        cowLine({ numberOfAnimalsQuantity: '2' }),
        bisonLine({ numberOfAnimalsQuantity: '5' }),
        horseLine({ numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.selectedCommodities).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS, 'Bison bison'],
        animals: '7'
      },
      {
        code: '0101',
        name: 'Horse',
        latinNames: ['Equus caballus'],
        animals: '3'
      }
    ])
  })

  it('Should offer the route back to the commodity question alongside the cards', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      commodityLines: [catLine({ numberOfAnimalsQuantity: '2' })]
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
        cowLine({ numberOfAnimalsQuantity: '2' }),
        catLine({ numberOfAnimalsQuantity: '3' })
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
        cowLine({ numberOfAnimalsQuantity: '2' }),
        catLine({ numberOfAnimalsQuantity: '3' })
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
        cowLine({
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
        cowLine({
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
        cowLine({
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }),
        catLine({
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
        cowLine({
          speciesSelection: '',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(savedAnimalLabels(card)[0]).toBe('Animal 1')
  })

  it('Should give the permanent address its own column where the commodity requires one', async () => {
    const [card] = await viewCards({
      commodityLines: [
        catLine({
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
        horseLine({
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, IDENTIFICATION_PAGE)
    })
    const [unit] = result.after.commodityLines[0].animalIdentifiers
    expect(unit.animalIdentifierEarTag).toBe('UK1')
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should reject an empty Save and add another — never append a blank record', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': '' }
    })
    expect(result.view.context.errors[EAR_TAG_FIELD_0]).toBe(
      'Enter at least one identifier for this animal'
    )
    expect(result.after.commodityLines[0].animalIdentifiers).toBeUndefined()
  })

  it('Should log the refusal once with the journey, the action and the refused fields', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': '' }
    })
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: result.journeyId,
          action: 'add:0',
          refusedFields: [EAR_TAG_FIELD_0]
        },
        message:
          'Animal identification refused: the submitted details failed validation'
      }
    ])
  })

  it('Should surface the engine cap rejection as a card-level error when a stale form posts once every animal is entered', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          cowLine({
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
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, lineIndex: 0, cap: 1 },
        message:
          'Animal identification refused: line already holds all its animals'
      }
    ])
  })

  it('Should block a partial permanent address on the pressed card', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [catLine({ numberOfAnimalsQuantity: '2' })] },
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
          cowLine({ numberOfAnimalsQuantity: '2' }),
          bisonLine({ numberOfAnimalsQuantity: '2' })
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '1' })] },
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '1' })] },
      payload: {}
    })
    expect(result.response).toEqual({
      redirect: hubPath(result.journeyId)
    })
    expect(result.after).toEqual({
      commodityLines: [cowLine({ numberOfAnimalsQuantity: 1 })]
    })
  })

  it('Should save the one-animal line and leave a multi-animal line unsaved when both hold typed values', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          cowLine({ numberOfAnimalsQuantity: '1' }),
          catLine({ numberOfAnimalsQuantity: '2' })
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
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
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
          cowLine({
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
          cowLine({
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
        cowLine({ animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }] })
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:5:0' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a remove for an out-of-range unit index and delete nothing', async () => {
    const seed = {
      commodityLines: [
        cowLine({ animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }] })
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:0:5' }
    })
    expect(result.response.statusCode).toBe(400)
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

describe(`${SUITE} — identifier render matrix — model metadata per selectable species`, () => {
  setupIdentificationEngine()

  const speciesLine = (commoditySelection, speciesSelection) => ({
    commoditySelection,
    speciesSelection,
    numberOfPackages: '',
    numberOfAnimalsQuantity: '2'
  })

  const renderFor = async (commodity, species) => {
    const [card] = await viewCards({
      commodityLines: [speciesLine(commodity, species)]
    })
    return {
      fieldIds: card.fields.map((field) => field.id),
      showAddress: card.showAddress
    }
  }

  const MATRIX = [
    {
      commodity: 'Cow',
      species: '1148346',
      fieldIds: [EAR_TAG_FIELD_0, PASSPORT_FIELD_0],
      showAddress: false
    },
    {
      commodity: 'Horse',
      species: '822332',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, 'horseName-0'],
      showAddress: false
    },
    {
      commodity: 'Cat',
      species: '923501',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
      showAddress: true
    },
    {
      commodity: 'Dog',
      species: '923502',
      fieldIds: [MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
      showAddress: true
    }
  ]

  it.each(MATRIX)(
    'Should render the identifier fields for $commodity',
    async ({ commodity, species, fieldIds, showAddress }) => {
      const rendered = await renderFor(commodity, species)
      expect(rendered.fieldIds).toEqual(fieldIds)
      expect(rendered.showAddress).toBe(showAddress)
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

  it('Should give a fish line no card but keep it in the summary', async () => {
    const context = await viewContext({
      commodityLines: [
        cowLine({ numberOfAnimalsQuantity: '2' }),
        fishLine({ numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.sections.map((section) => section.heading)).toEqual([
      COW_HEADING
    ])
    expect(context.selectedCommodities).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS],
        animals: '2'
      },
      {
        code: '0301',
        name: 'Fish',
        latinNames: ['Salmo salar'],
        animals: '3'
      }
    ])
  })

  it('Should keep a surviving card on its own commodity-line index when an earlier line is filtered out', async () => {
    const context = await viewContext({
      commodityLines: [
        fishLine({ numberOfAnimalsQuantity: '3' }),
        cowLine({ numberOfAnimalsQuantity: '2' })
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
      commodityLines: [fishLine({ numberOfAnimalsQuantity: '3' })]
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

  const untouchedFishAnswers = {
    commodityLines: [fishLine({ numberOfAnimalsQuantity: 3 })]
  }

  it('Should carry a stale add post on without writing a record, logging the skip once', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [fishLine({ numberOfAnimalsQuantity: '3' })] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after).toEqual(untouchedFishAnswers)
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId },
        message:
          'Animal identification skipped: nothing on the consignment carries an identifier'
      }
    ])
  })

  it('Should carry a stale remove post on without deleting a record', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [fishLine({ numberOfAnimalsQuantity: '3' })] },
      payload: { action: REMOVE_FIRST_UNIT }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after).toEqual(untouchedFishAnswers)
  })
})
