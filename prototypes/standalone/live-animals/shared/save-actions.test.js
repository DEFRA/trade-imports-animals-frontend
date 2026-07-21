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
import { base, hubExitTarget } from './kit.js'

import * as importPurpose from '../features/import-purpose/controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification.controller.js'
import * as documents from '../features/documents/controller.js'
import * as cphNumber from '../features/cph-number/controller.js'

const drivePost = async (
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

describe('save actions — hub exit semantics', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should expose the hub href for the cancel link from kit.base', () => {
    expect(base('Any page').hubHref).toBe(hubPath())
  })

  it('Should resolve the hub target only for the named exit submit', () => {
    expect(hubExitTarget({ payload: { exit: 'hub' } })).toBe(hubPath())
    expect(hubExitTarget({ payload: {} })).toBeNull()
    expect(hubExitTarget({ payload: undefined })).toBeNull()
  })

  // purposeInInternalMarket is activated by reasonForImport=internalMarket,
  // so the commits below seed the gate to keep the committed value in scope —
  // plus the two enforcedAt=continue prerequisites, so the section's next
  // page (additional-details) is reachable for the no-exit contrast.
  const purposeInScope = {
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: 'Cat' }],
    reasonForImport: 'internalMarket'
  }

  it('Should commit the page and redirect to the hub on Save and return to hub', async () => {
    const { response, after } = await drivePost(postHandlerOf(importPurpose), {
      payload: { purposeInInternalMarket: 'breeding', exit: 'hub' },
      seed: purposeInScope
    })
    expect(response).toEqual({ redirect: hubPath() })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should keep Save and continue on the flow target when no exit is named', async () => {
    const { response, after } = await drivePost(postHandlerOf(importPurpose), {
      payload: { purposeInInternalMarket: 'breeding' },
      seed: purposeInScope
    })
    expect(response).toEqual({ redirect: pagePath('additional-details') })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should reject an invalid Save and return to hub with the same errors as Save and continue', async () => {
    const invalid = { purposeInInternalMarket: 'not-a-purpose' }
    const plain = await drivePost(postHandlerOf(importPurpose), {
      payload: invalid
    })
    const exit = await drivePost(postHandlerOf(importPurpose), {
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
    const { response } = await drivePost(postHandlerOf(importPurpose), {
      payload: { purposeInInternalMarket: 'breeding' },
      query: { change: '1' },
      seed: purposeInScope
    })
    expect(response).toEqual({ redirect: pagePath('notification-view') })
  })

  it('Should let an explicit hub exit win over the change context', async () => {
    const { response, after } = await drivePost(postHandlerOf(importPurpose), {
      payload: { purposeInInternalMarket: 'breeding', exit: 'hub' },
      query: { change: '1' },
      seed: purposeInScope
    })
    expect(response).toEqual({ redirect: hubPath() })
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
    const { response, after } = await drivePost(
      postHandlerOf(consignmentDetails),
      {
        payload: { 'numberOfAnimalsQuantity-0': '2', exit: 'hub' },
        seed
      }
    )
    expect(response).toEqual({ redirect: hubPath() })
    expect(after.commodityLines[0].numberOfAnimalsQuantity).toBe('2')
  })

  it('Should commit a depth-2 identifier unit and redirect to the hub on the exit submit', async () => {
    const { response, after } = await drivePost(
      postHandlerOf(animalIdentification),
      {
        payload: { 'animalIdentifierPassport-0': 'UK123456789', exit: 'hub' },
        seed: { commodityLines: [{ commoditySelection: 'Cat' }] }
      }
    )
    expect(response).toEqual({ redirect: hubPath() })
    expect(after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should exit a multi-button loop page to the hub without disturbing its own actions', async () => {
    const exit = await drivePost(postHandlerOf(documents), {
      payload: { exit: 'hub' }
    })
    expect(exit.response).toEqual({ redirect: hubPath() })

    const add = await drivePost(postHandlerOf(documents), {
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
      }
    })
    expect(add.response).toEqual({
      redirect: pagePath('accompanying-documents')
    })
    expect(add.after.documents).toHaveLength(1)
  })

  it('Should let the hub exit win over a return-to-addresses entry context', async () => {
    // The CPH obligation is anyItem-gated on a CPH-triggering commodity line.
    const cphInScope = {
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    const returned = await drivePost(postHandlerOf(cphNumber), {
      payload: { countyParishHoldingCph: '123456789' },
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(returned.response).toEqual({ redirect: pagePath('addresses') })

    const exit = await drivePost(postHandlerOf(cphNumber), {
      payload: { countyParishHoldingCph: '123456789', exit: 'hub' },
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(exit.response).toEqual({ redirect: hubPath() })
    expect(exit.after.countyParishHoldingCph).toBe('123456789')
  })
})
