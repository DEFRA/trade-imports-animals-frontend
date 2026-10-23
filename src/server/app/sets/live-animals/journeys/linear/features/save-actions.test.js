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
  postHandlerOf
} from '../../../../../engine/test-support.js'
import { seedWithCommodityLineOfAnimals } from '../../../test-support.js'
import { dispatchPages } from './index.js'
import { base, hubExitTarget } from '../../../../../shared/kit.js'

import * as importReason from './import-reason/controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import * as cphNumber from './cph-number/controller.js'

const reasonPrerequisites = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat' }]
}

const internalMarketPayload = {
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding'
}

describe('save actions — hub exit semantics', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
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

  it('Should commit the page and redirect to the hub on Save and return to overview', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: { ...internalMarketPayload, exit: 'hub' },
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should send Save and continue to the overview outside the opening run when no exit is named', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: internalMarketPayload,
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should reject an invalid Save and return to overview with the same errors as Save and continue', async () => {
    const invalid = {
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'not-a-purpose'
    }
    const plain = await driveHandler(postHandlerOf(importReason), {
      payload: invalid
    })
    const exit = await driveHandler(postHandlerOf(importReason), {
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
    const { journeyId, response } = await driveHandler(
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
    const { journeyId, response, after } = await driveHandler(
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
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: { 'numberOfAnimalsQuantity-0': '2', exit: 'hub' },
        seed
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].numberOfAnimalsQuantity).toBe(2)
  })

  it('Should commit a depth-2 identifier unit and redirect to the hub on the exit submit for a one-animal line', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { 'animalIdentifierPassport-0': 'UK123456789', exit: 'hub' },
        seed: seedWithCommodityLineOfAnimals(1)
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should exit a multi-button loop page to the hub without disturbing its own actions', async () => {
    const exit = await driveHandler(postHandlerOf(documents), {
      payload: { exit: 'hub' }
    })
    expect(exit.response).toEqual({ redirect: hubPath(exit.journeyId) })

    const removal = await driveHandler(postHandlerOf(documents), {
      payload: { action: 'remove:1' },
      seed: {
        documents: [
          { accompanyingDocumentReference: 'GBHC1111111111' },
          { accompanyingDocumentReference: 'GBHC2222222222' }
        ]
      }
    })
    expect(removal.response).toEqual({
      redirect: pagePath(removal.journeyId, 'accompanying-documents')
    })
    expect(
      removal.after.documents.map(
        ({ accompanyingDocumentReference }) => accompanyingDocumentReference
      )
    ).toEqual(['GBHC1111111111'])
  })

  it('Should let the hub exit win over a return-to-addresses entry context', async () => {
    // The CPH obligation is anyItem-gated on a CPH-triggering commodity line.
    const cphInScope = {
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    const cphParts = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }
    const returned = await driveHandler(postHandlerOf(cphNumber), {
      payload: cphParts,
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(returned.response).toEqual({
      redirect: pagePath(returned.journeyId, 'addresses')
    })

    const exit = await driveHandler(postHandlerOf(cphNumber), {
      payload: { ...cphParts, exit: 'hub' },
      query: { return: 'addresses' },
      seed: cphInScope
    })
    expect(exit.response).toEqual({ redirect: hubPath(exit.journeyId) })
    expect(exit.after.countyParishHoldingCph).toBe('123456789')
  })
})

describe('save actions — amend endings', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it("Should return an amend's Save and return to the review and send its Save and continue onwards", async () => {
    const postAmending = (query) =>
      driveHandler(postHandlerOf(importReason), {
        seed: reasonPrerequisites,
        payload: internalMarketPayload,
        query,
        amend: true
      })

    const saveAndReturn = await postAmending({ change: '1' })
    const saveAndContinue = await postAmending({})

    expect(saveAndReturn.response).toEqual({
      redirect: pagePath(saveAndReturn.journeyId, 'notification-view')
    })
    expect(saveAndContinue.response).toEqual({
      redirect: hubPath(saveAndContinue.journeyId)
    })
  })
})
