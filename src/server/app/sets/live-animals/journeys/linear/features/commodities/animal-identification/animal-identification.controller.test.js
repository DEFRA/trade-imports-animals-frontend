import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
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
const IDENTIFICATION_PAGE = 'commodities/identification'
const REMOVE_FIRST_UNIT = 'remove:0:0'
const BOS_TAURUS_1 = 'Bos taurus 1'

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

const viewCards = async (seed) => (await viewContext(seed)).cards

const SUITE =
  '#animalIdentificationController — the single card-per-species surface'

const setupIdentificationEngine = () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
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
    expect(card.title).toBe('Cow (0102) — Bos taurus')
    expect(card.counter).toBe('Enter details for Bos taurus 2 of 2')
    expect(card.atMax).toBe(false)
    expect(card.units).toHaveLength(1)
    expect(card.units[0].label).toBe(BOS_TAURUS_1)
  })

  it('Should drop the M from the counter while the count is unanswered — no cap, entry still allowed', async () => {
    const [card] = await viewCards({ commodityLines: [catLine()] })
    expect(card.counter).toBe('Enter details for Felis catus')
    expect(card.atMax).toBe(false)
  })

  it('Should show only the commodity-gated fields per card — typed for Cats with the address, no fallbacks', async () => {
    const [card] = await viewCards({ commodityLines: [catLine()] })
    const labels = card.fields.map((field) => field.label)
    expect(labels).toEqual(['Microchip number', 'Passport', 'Tattoo'])
    expect(card.showAddress).toBe(true)
    const ids = card.fields.map((field) => field.id)
    expect(ids).toEqual([MICROCHIP_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0])
  })

  // Design release 1 asks for each commodity's identifiers in the order that
  // commodity's own list gives, so a cow is asked for its ear tag — the
  // identifier a cow actually carries — before its passport, where a horse is
  // asked for its microchip first. This pins the rendered order per
  // commodity; that the order is a property of the COMMODITY rather than one
  // global sequence is pinned by #identifiersFor in
  // services/commodities/index.test.js.
  it("Should order each commodity's entry fields by that commodity's own identifier list", async () => {
    const [cow] = await viewCards({ commodityLines: [cowLine()] })
    expect(cow.fields.map((field) => field.id)).toEqual([
      EAR_TAG_FIELD_0,
      PASSPORT_FIELD_0,
      TATTOO_FIELD_0
    ])

    const [horse] = await viewCards({ commodityLines: [horseLine()] })
    expect(horse.fields.map((field) => field.label)).toEqual([
      'Microchip number',
      'Passport',
      'Horse name'
    ])
  })

  it('Should replace the entry form with the maximum-reached state at N = M, keeping the rows removable', async () => {
    const [card] = await viewCards({
      commodityLines: [
        cowLine({
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    })
    expect(card.atMax).toBe(true)
    expect(card.counter).toBeNull()
    expect(card.fields).toEqual([])
    expect(card.maxReachedText).toContain('all 1 Bos taurus animals')
    expect(card.units).toHaveLength(1)
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
    expect(card.atMax).toBe(true)
    expect(card.maxReachedText).toBe(
      'This commodity line lists 1 Bos taurus animals but you have entered details for 2. Remove 1 to continue.'
    )
    expect(card.units).toHaveLength(2)
    expect(card.units[0].removeAria).toBe('animal 1')
  })
})

describe(`${SUITE} — the Selected commodities summary`, () => {
  setupIdentificationEngine()

  it('Should summarise every line with its code, common name and declared count', async () => {
    const context = await viewContext({
      commodityLines: [
        cowLine({ numberOfAnimalsQuantity: '2' }),
        horseLine({ numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.selectedCommodities).toEqual([
      { code: '0102', name: 'Domestic cattle', animals: '2' },
      { code: '0101', name: 'Horse', animals: '3' }
    ])
  })

  // The link to the commodity question used to live only in the no-commodities
  // branch of the template, so it vanished as soon as the page had cards. The
  // href the summary and the Add another commodity link both use is the same
  // one either way.
  it('Should offer the route back to the commodity question alongside the cards', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, { commodityLines: [catLine()] })
    const h = stubH()
    await getHandler(journeyRequest(journey.journeyId), h)
    const { addHref } = h.captured.view.context

    expect(addHref).toBe(pagePath(journey.journeyId, 'commodities'))
  })

  // A trader who miscounted has nowhere to go from the counter otherwise: the
  // count lives on consignment details, and dropping it is refused outright.
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
    const { cards } = h.captured.view.context

    expect(cards.map((card) => card.changeCountHref)).toEqual([
      pagePath(journey.journeyId, 'consignment-details'),
      pagePath(journey.journeyId, 'consignment-details')
    ])
  })

  // Arriving from check-your-answers, the way back to the count has to keep
  // the change context or Continue on consignment details lands on the hub.
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
    const { cards } = h.captured.view.context

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
    expect(card.identifierColumns).toEqual(['Ear tag', 'Passport', 'Tattoo'])
    expect(card.units[0].cells).toEqual(['UK1', '', ''])
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
    expect(card.units.map((unit) => unit.label)).toEqual([
      BOS_TAURUS_1,
      'Bos taurus 2'
    ])
    expect(card.units[1].cells).toEqual(['', 'UK2', ''])
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
    expect(cards[0].units.map((unit) => unit.label)).toEqual([BOS_TAURUS_1])
    expect(cards[1].units.map((unit) => unit.label)).toEqual(['Felis catus 1'])
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
    expect(card.units[0].label).toBe('Animal 1')
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
    expect(card.identifierColumns).toEqual([
      'Microchip',
      'Passport',
      'Tattoo',
      'Permanent address'
    ])
    expect(card.units[0].cells).toEqual(['', 'UK123456789', '', 'Pet Owner'])
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
    expect(card.identifierColumns).toEqual([
      'Microchip',
      'Passport',
      'Horse name'
    ])
    expect(card.units[0].cells).toEqual(['', '', 'Shergar'])
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
      seed: { commodityLines: [cowLine()] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': '' }
    })
    // The error anchors to the first box the commodity asks for, so the
    // summary link lands a cow's trader on its ear tag.
    expect(result.view.context.errors[EAR_TAG_FIELD_0]).toBe(
      'Enter at least one identifier for this animal'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should surface the engine cap rejection as a card-level error when a stale form posts at N = M', async () => {
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
  })

  it('Should block a partial permanent address exactly as the retired entry page did', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [catLine()] },
      payload: {
        action: 'add:0',
        [PASSPORT_FIELD_0]: 'UK123456789',
        'nameOrOrganisationName-0': 'Pet Owner'
      }
    })
    expect(result.view.context.errors['addressLine1-0']).toBe(
      'Enter address line 1'
    )
    expect(result.after).toEqual(result.before)
  })
})

// The page primary is the shared "Save and continue", so it carries no action
// of its own — the post falls through to the save-and-move-on default.
describe(`${SUITE} — Save and continue`, () => {
  setupIdentificationEngine()

  it('Should append the held record then exit along the section flow to the hub', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
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
      seed: { commodityLines: [cowLine()] },
      payload: {}
    })
    expect(result.response).toEqual({
      redirect: hubPath(result.journeyId)
    })
    expect(result.after).toEqual(result.before)
  })

  it('Should append every card whose form holds data across a multi-species surface', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [cowLine(), catLine()] },
      payload: {
        'animalIdentifierEarTag-0': 'UK1',
        'animalIdentifierPassport-1': 'UK123456789'
      }
    })
    expect(
      result.after.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK1')
    expect(
      result.after.commodityLines[1].animalIdentifiers[0]
        .animalIdentifierPassport
    ).toBe('UK123456789')
  })
})

describe(`${SUITE} — Implicit submit — Enter mid-entry fires the safe default, never a remove`, () => {
  setupIdentificationEngine()

  it('Should treat the finish default as non-destructive — keeps existing records and appends the half-filled entry', async () => {
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
    expect(tags).toEqual(['UK1', 'UK2'])
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
    const server = Hapi.server()
    await server.register(Crumb)
    server.route(animalIdentification.routes)

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

// The identifier-field render reads the `.metadata.values` (the coverage-gated
// sidecar), normalising the selected commodity NAME to a CN code via
// commodityCodeFor before comparing. This matrix pins the rendered fields per
// selectable species that carries identifiers (Cow/Horse/Cat/Dog). Fish
// carries none, so it is not in the matrix — it earns no panel at all, which
// the "no commodity carries an identifier" suite below pins instead.
describe(`${SUITE} — identifier render matrix — model metadata per selectable species`, () => {
  setupIdentificationEngine()

  const speciesLine = (commoditySelection, speciesSelection) => ({
    commoditySelection,
    speciesSelection,
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
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
      fieldIds: [EAR_TAG_FIELD_0, PASSPORT_FIELD_0, TATTOO_FIELD_0],
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

// Design release 1 asks for identification only where the commodity has an
// identifier type of its own. Fish is on none of the allowlists, so it earns
// no panel — and where no line earns one there is no page to show: the
// request carries on to the next step rather than rendering an empty surface.
describe(`${SUITE} — a commodity that carries no identifier of its own`, () => {
  setupIdentificationEngine()

  const requestPage = async (seed) => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, seed)
    const h = stubH()
    const response = await getHandler(journeyRequest(journey.journeyId), h)
    return { journeyId: journey.journeyId, response, view: h.captured.view }
  }

  it('Should give a fish line no panel but keep it in the summary', async () => {
    const context = await viewContext({
      commodityLines: [
        cowLine({ numberOfAnimalsQuantity: '2' }),
        fishLine({ numberOfAnimalsQuantity: '3' })
      ]
    })
    expect(context.cards.map((card) => card.title)).toEqual([
      'Cow (0102) — Bos taurus'
    ])
    // The recap is the whole consignment: the fish line the page asks nothing
    // of still has to appear, or the table misdescribes what was declared.
    expect(context.selectedCommodities).toEqual([
      { code: '0102', name: 'Domestic cattle', animals: '2' },
      { code: '0301', name: 'Atlantic salmon', animals: '3' }
    ])
  })

  // The card keeps its own commodity-line index, not its position among the
  // rendered cards: the anchor, the field names and the add action all address
  // the line by index, and consignment-details' count-drop error points at the
  // same anchor.
  it('Should keep a surviving card on its own commodity-line index when an earlier line is filtered out', async () => {
    const context = await viewContext({
      commodityLines: [
        fishLine({ numberOfAnimalsQuantity: '3' }),
        cowLine({ numberOfAnimalsQuantity: '2' })
      ]
    })
    expect(context.cards).toHaveLength(1)
    expect(context.cards[0].index).toBe(1)
    expect(context.cards[0].anchor).toBe('identification-card-1')
    expect(context.cards[0].fields.map((field) => field.id)).toEqual([
      'animalIdentifierEarTag-1',
      'animalIdentifierPassport-1',
      'animalIdentifierTattoo-1'
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

  // A stale form posted against a consignment with nothing to identify is
  // carried on rather than falling through to the add/remove handling. The
  // store holds the declared count as a number once saved, so the untouched
  // answers are stated outright rather than compared against the raw seed.
  const untouchedFishAnswers = {
    commodityLines: [fishLine({ numberOfAnimalsQuantity: 3 })]
  }

  it('Should carry a stale add post on without writing a record', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [fishLine({ numberOfAnimalsQuantity: '3' })] },
      payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after).toEqual(untouchedFishAnswers)
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
