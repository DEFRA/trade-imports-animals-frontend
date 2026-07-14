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

import * as commoditiesList from '../features/commodities/list.controller.js'
import * as commoditiesSelect from '../features/commodities/select.controller.js'
import * as identifiersList from '../features/commodities/animal-identifiers.list.controller.js'
import * as identifierEntry from '../features/commodities/animal-identifiers.entry.controller.js'
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
      typeSelection: '',
      speciesSelection: [],
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
    it('Should carry the context from the commodities list into the select sub-page on Add', async () => {
      const { response } = await drive(postHandlerOf(commoditiesList), {
        payload: { action: 'add' },
        query: change,
        seed: lineSeed
      })
      expect(response).toEqual({
        redirect: `${pagePath('commodities/select')}?change=1`
      })
    })

    it('Should carry the context from the select append into the details sub-page', async () => {
      const { response, after } = await drive(
        postHandlerOf(commoditiesSelect),
        {
          payload: { commoditySelection: 'Cat' },
          query: change
        }
      )
      expect(response).toEqual({
        redirect: `${pagePath('commodities/0/details')}?change=1`
      })
      expect(after.commodityLines).toHaveLength(1)
    })

    it('Should carry the context through an identifier add-another PRG cycle with the unit committed', async () => {
      const { response, after } = await drive(postHandlerOf(identifierEntry), {
        payload: { animalIdentifierPassport: 'UK123456789' },
        query: change,
        params: { index: '0' },
        seed: lineSeed
      })
      expect(response).toEqual({
        redirect: `${pagePath('commodities/0/identifiers')}?change=1`
      })
      expect(
        after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
      ).toBe('UK123456789')
    })

    it('Should carry the context through a documents add-another PRG cycle with the entry committed', async () => {
      const { response, after } = await drive(postHandlerOf(documents), {
        payload: {
          action: 'add',
          accompanyingDocumentType: '',
          accompanyingDocumentAttachmentType: '',
          accompanyingDocumentReference: 'GBHC1234567890'
        },
        query: change
      })
      expect(response).toEqual({
        redirect: `${pagePath('accompanying-documents')}?change=1`
      })
      expect(after.documents).toHaveLength(1)
    })

    it('Should carry the context through a documents remove round-trip', async () => {
      const removeHandler = documents.routes.find(
        (route) => route.method === 'GET' && route.path.includes('/remove')
      ).handler
      const { response, after } = await drive(removeHandler, {
        query: change,
        params: { index: '0' },
        seed: { documents: [{ accompanyingDocumentReference: 'GBHC1' }] }
      })
      expect(response).toEqual({
        redirect: `${pagePath('accompanying-documents')}?change=1`
      })
      expect(after.documents ?? []).toHaveLength(0)
    })
  })

  describe('only the collection exit repoints to check your answers', () => {
    it('Should send the commodities list Continue back to check your answers under change context', async () => {
      const { response } = await drive(postHandlerOf(commoditiesList), {
        query: change,
        seed: lineSeed
      })
      expect(response).toEqual({ redirect: cya })
    })

    it('Should send the identifier list Continue back to check your answers under change context', async () => {
      const { response } = await drive(postHandlerOf(identifiersList), {
        query: change,
        params: { index: '0' },
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

    it('Should keep the commodities list Continue on the flow target without change context', async () => {
      const { response } = await drive(postHandlerOf(commoditiesList), {
        seed: { countryOfOrigin: 'FR', ...lineSeed }
      })
      expect(response).toEqual({ redirect: hubPath() })
    })

    it('Should keep the identifier list Continue on the commodities list without change context', async () => {
      const { response } = await drive(postHandlerOf(identifiersList), {
        params: { index: '0' },
        seed: lineSeed
      })
      expect(response).toEqual({ redirect: pagePath('commodities') })
    })

    it('Should let an explicit hub exit win over the change context on a collection exit', async () => {
      const list = await drive(postHandlerOf(commoditiesList), {
        payload: { exit: 'hub' },
        query: change,
        seed: lineSeed
      })
      expect(list.response).toEqual({ redirect: hubPath() })

      const identifiers = await drive(postHandlerOf(identifiersList), {
        payload: { exit: 'hub' },
        query: change,
        params: { index: '0' },
        seed: lineSeed
      })
      expect(identifiers.response).toEqual({ redirect: hubPath() })
    })
  })
})
