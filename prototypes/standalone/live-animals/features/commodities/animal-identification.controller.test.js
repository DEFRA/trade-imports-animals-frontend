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
  (route) => route.method === 'GET' && !route.path.includes('remove')
).handler
const removeHandler = animalIdentification.routes.find((route) =>
  route.path.includes('remove')
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

describe('animal identification — the single card-per-species surface (inc-063, D16)', () => {
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
      expect(card.rows).toHaveLength(1)
      expect(card.rows[0].value.text).toContain('Ear tag: UK1')
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
      expect(card.rows).toHaveLength(1)
      expect(card.rows[0].actions.items[0].text).toBe('Remove')
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

  describe('Remove', () => {
    it('Should remove the named record and return to the surface — a freed slot reopens the entry form', async () => {
      const result = await driveHandler(removeHandler, {
        seed: {
          commodityLines: [
            cowLine({
              numberOfAnimalsQuantity: '1',
              animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
            })
          ]
        },
        params: { line: '0', unit: '0' }
      })
      expect(result.response).toEqual({
        redirect: pagePath('commodities/identification')
      })
      expect(result.after.commodityLines[0].animalIdentifiers).toEqual([])
    })

    it('Should ignore an out-of-range line index', async () => {
      const result = await driveHandler(removeHandler, {
        seed: {
          commodityLines: [
            cowLine({ animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }] })
          ]
        },
        params: { line: '5', unit: '0' }
      })
      expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    })
  })
})
