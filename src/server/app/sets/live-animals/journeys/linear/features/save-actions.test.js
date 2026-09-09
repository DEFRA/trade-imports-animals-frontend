import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import {
  stubH,
  journeyRequest,
  postHandlerOf
} from '../../../../../engine/test-support.js'
import { dispatchPages } from './index.js'
import { base, hubExitTarget } from '../../../../../shared/kit.js'

import * as importReason from './import-reason/controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import * as cphNumber from './cph-number/controller.js'

const drivePost = async (
  handler,
  { payload = {}, query = {}, seed = {}, params = {} } = {}
) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, { payload, query, params }),
    h
  )
  const after = (await store.get(journey.journeyId)).answers
  return {
    journeyId: journey.journeyId,
    response,
    after,
    view: h.captured.view
  }
}

describe('save actions — hub exit semantics', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should expose the hub href for the cancel link from kit.base', () => {
    expect(
      base('Any page', { journey: { journeyId: 'journey-1' } }).hubHref
    ).toBe(hubPath('journey-1'))
  })

  it('Should resolve the hub target only for the named exit submit', () => {
    expect(
      hubExitTarget({
        payload: { exit: 'hub' },
        params: { journeyId: 'journey-1' }
      })
    ).toBe(hubPath('journey-1'))
    expect(
      hubExitTarget({ payload: {}, params: { journeyId: 'journey-1' } })
    ).toBeNull()
    expect(hubExitTarget({ params: { journeyId: 'journey-1' } })).toBeNull()
  })

  // The reason page carries its own reveal, so the payload answers both the
  // reason and the purpose it opens. The seed supplies the two
  // enforcedAt=continue prerequisites, so the section's next page
  // (additional-details) is reachable for the no-exit contrast.
  const reasonPrerequisites = {
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: 'Cat' }]
  }
  const internalMarketPayload = {
    reasonForImport: 'internalMarket',
    purposeInInternalMarket: 'breeding'
  }

  it('Should commit the page and redirect to the hub on Save and return to overview', async () => {
    const { journeyId, response, after } = await drivePost(
      postHandlerOf(importReason),
      {
        payload: { ...internalMarketPayload, exit: 'hub' },
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should keep Save and continue on the flow target when no exit is named', async () => {
    const { journeyId, response, after } = await drivePost(
      postHandlerOf(importReason),
      {
        payload: internalMarketPayload,
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({
      redirect: pagePath(journeyId, 'additional-details')
    })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should reject an invalid Save and return to overview with the same errors as Save and continue', async () => {
    const invalid = {
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'not-a-purpose'
    }
    const plain = await drivePost(postHandlerOf(importReason), {
      payload: invalid
    })
    const exit = await drivePost(postHandlerOf(importReason), {
      payload: { ...invalid, exit: 'hub' }
    })
    expect(plain.response.redirect).toBeUndefined()
    expect(exit.response.redirect).toBeUndefined()
    expect(exit.view.view).toBe(plain.view.view)
    expect(exit.view.context.errors).toEqual(plain.view.context.errors)
    expect(exit.view.context.errors.purposeInInternalMarket).toBeDefined()
    expect(exit.after.purposeInInternalMarket).toBeUndefined()
  })

  it('Should send a change-context Save and continue back to check your answers', async () => {
    const { journeyId, response } = await drivePost(
      postHandlerOf(importReason),
      {
        payload: internalMarketPayload,
        query: { change: '1' },
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({
      redirect: pagePath(journeyId, 'notification-view')
    })
  })

  it('Should let an explicit hub exit win over the change context', async () => {
    const { journeyId, response, after } = await drivePost(
      postHandlerOf(importReason),
      {
        payload: { ...internalMarketPayload, exit: 'hub' },
        query: { change: '1' },
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should commit the consolidated details page and redirect to the hub on the exit submit', async () => {
    const seed = {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          speciesSelection: '923501',
          numberOfAnimalsQuantity: '',
          numberOfPackages: ''
        }
      ]
    }
    const { journeyId, response, after } = await drivePost(
      postHandlerOf(consignmentDetails),
      {
        payload: { 'numberOfAnimalsQuantity-0': '2', exit: 'hub' },
        seed
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].numberOfAnimalsQuantity).toBe(2)
  })

  it('Should commit a depth-2 identifier unit and redirect to the hub on the exit submit', async () => {
    const { journeyId, response, after } = await drivePost(
      postHandlerOf(animalIdentification),
      {
        payload: { 'animalIdentifierPassport-0': 'UK123456789', exit: 'hub' },
        seed: { commodityLines: [{ commoditySelection: 'Cat' }] }
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should exit a multi-button loop page to the hub without disturbing its own actions', async () => {
    const exit = await drivePost(postHandlerOf(documents), {
      payload: { exit: 'hub' }
    })
    expect(exit.response).toEqual({ redirect: hubPath(exit.journeyId) })

    const add = await drivePost(postHandlerOf(documents), {
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
      }
    })
    expect(add.response).toEqual({
      redirect: pagePath(add.journeyId, 'accompanying-documents')
    })
    expect(add.after.documents).toHaveLength(1)
  })

  it('Should let the hub exit win over a return-to-addresses entry context', async () => {
    // The CPH obligation is anyItem-gated on a CPH-triggering commodity line.
    const cphInScope = {
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    const cphParts = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }
    const returned = await drivePost(postHandlerOf(cphNumber), {
      payload: cphParts,
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(returned.response).toEqual({
      redirect: pagePath(returned.journeyId, 'addresses')
    })

    const exit = await drivePost(postHandlerOf(cphNumber), {
      payload: { ...cphParts, exit: 'hub' },
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(exit.response).toEqual({ redirect: hubPath(exit.journeyId) })
    expect(exit.after.countyParishHoldingCph).toBe('123456789')
  })
})
