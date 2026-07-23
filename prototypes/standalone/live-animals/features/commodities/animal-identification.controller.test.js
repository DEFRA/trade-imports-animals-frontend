import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../config.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as animalIdentification from './animal-identification.controller.js'

const post = postHandlerOf(animalIdentification)
const getHandler = animalIdentification.routes.find(
  (route) => route.method === 'GET'
).handler

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

const viewCards = async (seed) => {
  const journey = await store.create()
  await store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  await getHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view.context.cards
}

describe('#animalIdentificationController — the single card-per-species surface (inc-063, D16)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  describe('the cards view', () => {
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
      expect(card.units[0].summary).toContain('Ear tag: UK1')
    })

    it('Should drop the M from the counter while the count is unanswered — no cap, entry still allowed', async () => {
      const [card] = await viewCards({ commodityLines: [catLine()] })
      expect(card.counter).toBe('Enter details for Felis catus')
      expect(card.atMax).toBe(false)
    })

    it('Should show only the commodity-gated fields per card — typed for Cats with the address, no fallbacks', async () => {
      const [card] = await viewCards({ commodityLines: [catLine()] })
      const labels = card.fields.map((field) => field.label)
      expect(labels).toEqual(['Passport number', 'Tattoo'])
      expect(card.showAddress).toBe(true)
      const ids = card.fields.map((field) => field.id)
      expect(ids).toEqual([
        'animalIdentifierPassport-0',
        'animalIdentifierTattoo-0'
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
      expect(card.counter).toBe(null)
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

  describe('Save and add another', () => {
    it("Should append the card's record and stay on the surface with the PRG redirect", async () => {
      const result = await driveHandler(post, {
        seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
        payload: { action: 'add:0', 'animalIdentifierEarTag-0': 'UK1' }
      })
      expect(result.response).toEqual({
        redirect: pagePath('commodities/identification')
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
      expect(result.view.context.errors['animalIdentifierPassport-0']).toBe(
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
          'animalIdentifierPassport-0': 'UK123456789',
          'nameOrOrganisationName-0': 'Pet Owner'
        }
      })
      expect(result.view.context.errors['addressLine1-0']).toBe(
        'Enter address line 1'
      )
      expect(result.after).toEqual(result.before)
    })
  })

  describe('Save and finish', () => {
    it('Should append the held record then exit along the section flow to the hub', async () => {
      const result = await driveHandler(post, {
        seed: { commodityLines: [cowLine({ numberOfAnimalsQuantity: '2' })] },
        payload: { action: 'finish', 'animalIdentifierEarTag-0': 'UK1' }
      })
      expect(result.response).toEqual({ redirect: hubPath() })
      const [unit] = result.after.commodityLines[0].animalIdentifiers
      expect(unit.animalIdentifierEarTag).toBe('UK1')
      expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    })

    it('Should exit without appending when no form holds data — the zero-record pass', async () => {
      const result = await driveHandler(post, {
        seed: { commodityLines: [cowLine()] },
        payload: { action: 'finish' }
      })
      expect(result.response).toEqual({ redirect: hubPath() })
      expect(result.after).toEqual(result.before)
    })

    it('Should append every card whose form holds data across a multi-species surface', async () => {
      const result = await driveHandler(post, {
        seed: { commodityLines: [cowLine(), catLine()] },
        payload: {
          action: 'finish',
          'animalIdentifierEarTag-0': 'UK1',
          'animalIdentifierPassport-1': 'UK123456789'
        }
      })
      expect(
        result.after.commodityLines[0].animalIdentifiers[0]
          .animalIdentifierEarTag
      ).toBe('UK1')
      expect(
        result.after.commodityLines[1].animalIdentifiers[0]
          .animalIdentifierPassport
      ).toBe('UK123456789')
    })
  })

  describe('Implicit submit — Enter mid-entry fires the safe default, never a remove', () => {
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
      expect(result.response).toEqual({ redirect: hubPath() })
      const tags = result.after.commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierEarTag
      )
      expect(tags).toEqual(['UK1', 'UK2'])
    })
  })

  describe('Remove', () => {
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
        payload: { action: 'remove:0:0' }
      })
      expect(result.response).toEqual({
        redirect: pagePath('commodities/identification')
      })
      expect(result.after.commodityLines[0].animalIdentifiers).toEqual([])
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
        url: pagePath('commodities/identification'),
        payload: { action: 'remove:0:0' }
      })
      expect(forged.statusCode).toBe(403)

      const prefetched = await server.inject({
        method: 'GET',
        url: pagePath('commodities/identification/0/0/remove')
      })
      expect(prefetched.statusCode).toBe(404)
    })
  })

  // The identifier-field render reads B's `.metadata.values` (the coverage-gated
  // sidecar), normalising the selected commodity NAME to a CN code via
  // commodityCodeFor before comparing. This matrix pins the rendered fields per
  // selectable species (Cow/Horse/Cat/Dog/Fish).
  describe('identifier render matrix — B metadata per selectable species', () => {
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
        fieldIds: [
          'animalIdentifierPassport-0',
          'animalIdentifierTattoo-0',
          'animalIdentifierEarTag-0'
        ],
        showAddress: false
      },
      {
        commodity: 'Horse',
        species: '822332',
        fieldIds: ['animalIdentifierPassport-0', 'horseName-0'],
        showAddress: false
      },
      {
        commodity: 'Cat',
        species: '923501',
        fieldIds: ['animalIdentifierPassport-0', 'animalIdentifierTattoo-0'],
        showAddress: true
      },
      {
        commodity: 'Dog',
        species: '923502',
        fieldIds: ['animalIdentifierPassport-0', 'animalIdentifierTattoo-0'],
        showAddress: true
      },
      {
        commodity: 'Fish',
        species: '801204',
        fieldIds: [
          'animalIdentifierIdentificationDetails-0',
          'animalIdentifierDescription-0'
        ],
        showAddress: false
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
})
