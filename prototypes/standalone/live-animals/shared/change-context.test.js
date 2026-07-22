import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../config.js'
import { buildDispatch } from '../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { store } from '../engine/store.js'
import { configureRecords } from '../engine/persistence/records.js'
import { configureSession } from '../engine/persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { stubH, journeyRequest, postHandlerOf } from '../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import { exitTarget, withChangeContext } from './kit.js'

import * as commoditiesSearch from '../features/commodities/search.controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification.controller.js'
import * as documents from '../features/documents/controller.js'

const drive = async (
  handler,
  { payload = {}, query = {}, seed = {}, params = {} } = {}
) => {
  const journey = await store.create()
  await store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, { payload, query, params }),
    h
  )
  const after = (await store.get(journey.journeyId)).answers
  return { response, after, view: h.captured.view }
}

const change = { change: '1' }
const cya = pagePath('notification-view')

const lineSeed = {
  commodityLines: [
    {
      commoditySelection: 'Cat',
      speciesSelection: '923501',
      numberOfAnimalsQuantity: '',
      numberOfPackages: ''
    }
  ]
}

describe('change context — collection round-trip', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  describe('kit contracts', () => {
    it('Should append the change flag to an href only when the request carries change context', () => {
      expect(
        withChangeContext({ query: change }, pagePath('commodities'))
      ).toBe(`${pagePath('commodities')}?change=1`)
      expect(withChangeContext({ query: {} }, pagePath('commodities'))).toBe(
        pagePath('commodities')
      )
    })

    it('Should resolve the exit target with hub beating change and change beating the fallback', () => {
      const fallback = pagePath('commodities')
      expect(
        exitTarget({ payload: { exit: 'hub' }, query: change }, fallback)
      ).toBe(hubPath())
      expect(exitTarget({ payload: {}, query: change }, fallback)).toBe(cya)
      expect(exitTarget({ payload: {}, query: {} }, fallback)).toBe(fallback)
    })
  })

  describe('context survives the internal loop navigation', () => {
    it('Should carry the context from the search save into the consignment details page', async () => {
      const { response, after } = await drive(
        postHandlerOf(commoditiesSearch),
        {
          payload: { species: ['Cat|923501'] },
          query: change
        }
      )
      expect(response).toEqual({
        redirect: `${pagePath('consignment-details')}?change=1`
      })
      expect(after.commodityLines).toHaveLength(1)
    })

    it('Should carry the context on the details page Add-another and Remove affordances', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, lineSeed)
      const h = stubH()
      const getHandler = consignmentDetails.routes.find(
        (route) => route.method === 'GET' && !route.path.includes('remove')
      ).handler
      await getHandler(journeyRequest(journey.journeyId, { query: change }), h)
      const { addHref, groups } = h.captured.view.context
      expect(addHref).toBe(`${pagePath('commodities')}?change=1`)
      expect(groups[0].removeHref).toBe(
        `${pagePath('consignment-details/Cat/remove')}?change=1`
      )
    })

    it('Should carry the context through a commodity remove round-trip', async () => {
      const removeHandler = consignmentDetails.routes.find((route) =>
        route.path.includes('/remove')
      ).handler
      const { response, after } = await drive(removeHandler, {
        query: change,
        params: { commodity: 'Cat' },
        seed: lineSeed
      })
      expect(response).toEqual({
        redirect: `${pagePath('consignment-details')}?change=1`
      })
      expect(after.commodityLines ?? []).toHaveLength(0)
    })

    it('Should carry the context through an identifier Save-and-add-another PRG cycle with the unit committed', async () => {
      const { response, after } = await drive(
        postHandlerOf(animalIdentification),
        {
          payload: {
            action: 'add:0',
            'animalIdentifierPassport-0': 'UK123456789'
          },
          query: change,
          seed: lineSeed
        }
      )
      expect(response).toEqual({
        redirect: `${pagePath('commodities/identification')}?change=1`
      })
      expect(
        after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
      ).toBe('UK123456789')
    })

    it('Should carry the context through a documents add-another PRG cycle with the entry committed', async () => {
      const { response, after } = await drive(postHandlerOf(documents), {
        payload: {
          action: 'add',
          accompanyingDocumentReference: 'GBHC1234567890',
          'accompanyingDocumentDateOfIssue-day': '12',
          'accompanyingDocumentDateOfIssue-month': '12',
          'accompanyingDocumentDateOfIssue-year': '2025',
          file: {
            filename: 'itahc-certificate.pdf',
            headers: { 'content-type': 'application/pdf' },
            payload: Buffer.from('pdf-bytes')
          }
        },
        query: change
      })
      expect(response).toEqual({
        redirect: `${pagePath('accompanying-documents')}?change=1`
      })
      expect(after.documents).toHaveLength(1)
    })

    it('Should carry the context through a documents remove round-trip', async () => {
      const { response, after } = await drive(postHandlerOf(documents), {
        query: change,
        payload: { action: 'remove:0' },
        seed: { documents: [{ accompanyingDocumentReference: 'GBHC1' }] }
      })
      expect(response).toEqual({
        redirect: `${pagePath('accompanying-documents')}?change=1`
      })
      expect(after.documents ?? []).toHaveLength(0)
    })
  })

  describe('only the collection exit repoints to check your answers', () => {
    it('Should send the consignment details save back to check your answers under change context', async () => {
      const { response } = await drive(postHandlerOf(consignmentDetails), {
        query: change,
        seed: lineSeed
      })
      expect(response).toEqual({ redirect: cya })
    })

    it('Should send the identification Save-and-finish back to check your answers under change context', async () => {
      const { response } = await drive(postHandlerOf(animalIdentification), {
        payload: { action: 'finish' },
        query: change,
        seed: lineSeed
      })
      expect(response).toEqual({ redirect: cya })
    })

    it('Should send the documents Continue back to check your answers under change context', async () => {
      const { response } = await drive(postHandlerOf(documents), {
        query: change
      })
      expect(response).toEqual({ redirect: cya })
    })

    it('Should keep the consignment details save on the flow target without change context', async () => {
      const { response } = await drive(postHandlerOf(consignmentDetails), {
        seed: { countryOfOrigin: 'FR', ...lineSeed }
      })
      expect(response).toEqual({ redirect: hubPath() })
    })

    it('Should keep the identification Save-and-finish on the section flow (the hub) without change context', async () => {
      const { response } = await drive(postHandlerOf(animalIdentification), {
        payload: { action: 'finish' },
        seed: lineSeed
      })
      expect(response).toEqual({ redirect: hubPath() })
    })

    it('Should let an explicit hub exit win over the change context on a collection exit', async () => {
      const details = await drive(postHandlerOf(consignmentDetails), {
        payload: { exit: 'hub' },
        query: change,
        seed: lineSeed
      })
      expect(details.response).toEqual({ redirect: hubPath() })

      const identifiers = await drive(postHandlerOf(animalIdentification), {
        payload: { exit: 'hub', action: 'finish' },
        query: change,
        seed: lineSeed
      })
      expect(identifiers.response).toEqual({ redirect: hubPath() })
    })
  })
})
