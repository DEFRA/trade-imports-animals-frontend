import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  stubH,
  journeyRequest,
  postHandlerOf
} from '../../../../../engine/test-support.js'
import { seedWithCommodityLineOfAnimals } from '../../../test-support.js'
import { dispatchPages } from './index.js'
import { exitTarget, withChangeContext } from '../../../../../shared/kit.js'

import * as commoditiesSearch from './commodities/search/search.controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import { lineKey } from './commodities/search/selection/line-key.js'
import { SHOWN_SEARCH_ROWS } from './commodities/search/selection/rows.js'
import { FELIS_CATUS_ROW } from './commodities/search/test-support.js'

const change = { change: '1' }
const TEST_JOURNEY_ID = 'journey-1'
const cya = (journeyId) => pagePath(journeyId, 'notification-view')

const lineSeed = {
  commodityLines: [
    {
      commodityCode: '01061900',
      speciesLatinName: 'Felis catus',
      numberOfAnimalsQuantity: '',
      numberOfPackages: ''
    }
  ]
}

const savableLineCountPayload = { 'numberOfAnimalsQuantity-0': '1' }

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('change context — kit contracts', () => {
  it('Should append the change flag to an href only when the request carries change context', () => {
    expect(
      withChangeContext(
        { query: change },
        pagePath(TEST_JOURNEY_ID, 'commodities')
      )
    ).toBe(`${pagePath(TEST_JOURNEY_ID, 'commodities')}?change=1`)
    expect(
      withChangeContext({ query: {} }, pagePath(TEST_JOURNEY_ID, 'commodities'))
    ).toBe(pagePath(TEST_JOURNEY_ID, 'commodities'))
  })

  it('Should resolve the exit target with hub beating change and change beating the fallback', () => {
    const request = {
      payload: { exit: 'hub' },
      query: change,
      params: { journeyId: TEST_JOURNEY_ID }
    }
    const fallback = pagePath(TEST_JOURNEY_ID, 'commodities')
    expect(exitTarget(request, fallback)).toBe(hubPath(TEST_JOURNEY_ID))
    expect(exitTarget({ ...request, payload: {} }, fallback)).toBe(
      cya(TEST_JOURNEY_ID)
    )
    expect(exitTarget({ ...request, payload: {}, query: {} }, fallback)).toBe(
      fallback
    )
  })
})

describe('change context — context survives the internal loop navigation', () => {
  it('Should carry the context from the search save into the consignment details page', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(commoditiesSearch),
      {
        flowOnly: { [SHOWN_SEARCH_ROWS]: [FELIS_CATUS_ROW] },
        payload: { species: [lineKey(FELIS_CATUS_ROW)] },
        query: change
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'consignment-details')}?change=1`
    })
    expect(after.commodityLines).toEqual([
      expect.objectContaining(FELIS_CATUS_ROW)
    ])
  })

  it('Should carry the context on the details page Add-another affordance', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, lineSeed)
    const h = stubH()
    const getHandler = consignmentDetails.routes.find(
      (route) => route.method === 'GET'
    ).handler
    await getHandler(journeyRequest(journey.journeyId, { query: change }), h)
    const { addHref, groups } = h.captured.view.context
    expect(addHref).toBe(
      `${pagePath(journey.journeyId, 'commodities')}?change=1`
    )
    expect(groups[0].index).toBe(0)
  })

  it('Should carry the context to the commodity question when removing the last line', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: { action: 'remove:0' },
        query: change,
        seed: lineSeed
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'commodities')}?change=1`
    })
    expect(after.commodityLines ?? []).toHaveLength(0)
  })

  it('Should carry the context through an identifier Save-and-add-another PRG cycle for a two-animal line with the unit committed', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: {
          action: 'add:0',
          'animalIdentifierPassport-0': 'UK123456789'
        },
        query: change,
        seed: seedWithCommodityLineOfAnimals(2)
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'commodities/identification')}?change=1`
    })
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should carry the context through a documents add-another PRG cycle with the entry committed', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(documents),
      {
        payload: {
          action: 'add',
          accompanyingDocumentReference: 'GBHC1234567890',
          accompanyingDocumentType: 'ITAHC',
          accompanyingDocumentDateOfIssue: '12/12/2025',
          file: {
            filename: 'itahc-certificate.pdf',
            headers: { 'content-type': 'application/pdf' },
            payload: Buffer.from('pdf-bytes')
          }
        },
        query: change
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'accompanying-documents')}?change=1`
    })
    expect(after.documents).toHaveLength(1)
  })

  it('Should carry the context through a documents remove round-trip', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(documents),
      {
        query: change,
        payload: { action: 'remove:0' },
        seed: { documents: [{ accompanyingDocumentReference: 'GBHC1' }] }
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'accompanying-documents')}?change=1`
    })
    expect(after.documents ?? []).toHaveLength(0)
  })
})

describe('change context — only the collection exit repoints to check your answers', () => {
  it('Should send the consignment details save back to check your answers under change context', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: savableLineCountPayload,
        query: change,
        seed: lineSeed
      }
    )
    expect(response).toEqual({ redirect: cya(journeyId) })
  })

  it('Should send the identification Save-and-finish back to check your answers under change context', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { action: 'finish' },
        query: change,
        seed: lineSeed
      }
    )
    expect(response).toEqual({ redirect: cya(journeyId) })
  })

  it('Should send the documents Continue back to check your answers under change context', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(documents),
      {
        query: change
      }
    )
    expect(response).toEqual({ redirect: cya(journeyId) })
  })

  it('Should keep the consignment details save on the flow target without change context', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: savableLineCountPayload,
        seed: { countryOfOrigin: 'FR', ...lineSeed }
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
  })

  it('Should keep the identification Save-and-finish on the section flow (the hub) without change context', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { action: 'finish' },
        seed: lineSeed
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
  })

  it('Should let an explicit hub exit win over the change context on a collection exit', async () => {
    const details = await driveHandler(postHandlerOf(consignmentDetails), {
      payload: { ...savableLineCountPayload, exit: 'hub' },
      query: change,
      seed: lineSeed
    })
    expect(details.response).toEqual({
      redirect: hubPath(details.journeyId)
    })

    const identifiers = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { exit: 'hub', action: 'finish' },
        query: change,
        seed: lineSeed
      }
    )
    expect(identifiers.response).toEqual({
      redirect: hubPath(identifiers.journeyId)
    })
  })
})
