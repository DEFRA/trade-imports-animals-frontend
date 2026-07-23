import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { answersToFulfilments } from '../bridge/fulfilments.js'
import { characterisationCorpus } from '../bridge/fixtures/characterisation-corpus.js'
import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { journeyRequest, stubH } from './test-support.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../services/persistence/records/fulfilment-codec.js'
import { assembleRequestView } from './request-view.js'

import * as origin from '../features/origin/controller.js'
import * as importReason from '../features/import-reason/controller.js'
import * as importPurpose from '../features/import-purpose/controller.js'
import * as destinationCountry from '../features/destination-country/controller.js'
import * as portOfExit from '../features/port-of-exit/controller.js'
import * as exitDate from '../features/exit-date/controller.js'
import * as additionalDetails from '../features/additional-details/controller.js'
import * as addresses from '../features/addresses/controller.js'
import * as cphNumber from '../features/cph-number/controller.js'
import * as portOfEntry from '../features/transport/port-of-entry.controller.js'
import * as transitCountries from '../features/transport/transit-countries.controller.js'
import * as transporters from '../features/transport/transporters.controller.js'
import * as transportersSelect from '../features/transport/transporters-select.controller.js'
import * as privateTransporterDetails from '../features/transport/private-transporter-details.controller.js'
import * as contact from '../features/contact/controller.js'
import * as declaration from '../features/declaration/controller.js'
import * as commoditiesSearch from '../features/commodities/search.controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification.controller.js'
import * as documents from '../features/documents/controller.js'
import * as hub from '../features/hub/controller.js'
import * as checkAnswers from '../features/check-answers/controller.js'

const getHandlerOf = (feature) =>
  feature.routes.find((route) => route.method === 'GET').handler

const comprehensive = characterisationCorpus.find(
  ({ name }) => name === 'comprehensive'
).answers

const parityFixture = structuredClone(comprehensive)
for (const flowOrOutOfScope of [
  'importType',
  'declaration',
  'referenceNumber',
  'destinationCountry',
  'portOfExit',
  'exitDate',
  'privateTransporter'
]) {
  delete parityFixture[flowOrOutOfScope]
}
parityFixture.commodityLines[0].animalIdentifiers[1] = {
  animalIdentifierEarTag: 'UK123456789013',
  animalIdentifierPassport: 'UK123456780'
}

const transitFixture = {
  ...parityFixture,
  reasonForImport: 'transit',
  destinationCountry: comprehensive.destinationCountry,
  portOfExit: comprehensive.portOfExit
}
delete transitFixture.purposeInInternalMarket

const temporaryAdmissionFixture = {
  ...parityFixture,
  reasonForImport: 'temporaryAdmissionHorses',
  portOfExit: comprehensive.portOfExit,
  exitDate: comprehensive.exitDate
}
delete temporaryAdmissionFixture.purposeInInternalMarket

const privateTransportFixture = {
  ...parityFixture,
  transporterType: 'Private',
  privateTransporter: comprehensive.privateTransporter
}
delete privateTransportFixture.commercialTransporter

const scalarPages = [
  ['origin', origin, parityFixture],
  ['import reason', importReason, parityFixture],
  ['import purpose', importPurpose, parityFixture],
  ['destination country', destinationCountry, transitFixture],
  ['port of exit', portOfExit, transitFixture],
  ['exit date', exitDate, temporaryAdmissionFixture],
  ['additional details', additionalDetails, parityFixture],
  ['addresses', addresses, parityFixture],
  ['CPH number', cphNumber, parityFixture],
  ['port of entry', portOfEntry, parityFixture],
  ['transit countries', transitCountries, parityFixture],
  ['transporter type', transporters, parityFixture],
  ['commercial transporter', transportersSelect, parityFixture],
  ['private transporter', privateTransporterDetails, privateTransportFixture],
  ['contact', contact, parityFixture],
  ['declaration', declaration, parityFixture]
]

const canonicalViewOf = (answers) =>
  assembleRequestView(
    decodePersistedFulfilment(
      encodeEvaluatorFulfilments(answersToFulfilments(answers))
    )
  )

const contextFor = async (handler, journeyId, answers) => {
  await store.saveAnswers(journeyId, answers)
  const h = stubH()
  await handler(journeyRequest(journeyId), h)
  return h.captured.view?.context
}

const expectContextParity = async (feature, answers = parityFixture) => {
  const journey = await store.create()
  const handler = getHandlerOf(feature)
  const current = await contextFor(handler, journey.journeyId, answers)
  const canonical = await contextFor(
    handler,
    journey.journeyId,
    canonicalViewOf(answers).answers
  )
  expect(current).toBeDefined()
  expect(canonical).toBeDefined()
  expect(canonical).toEqual(current)
}

describe('canonical request-view controller parity', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  test.each(scalarPages)(
    'Should match the current name-keyed context for the %s page',
    async (_name, feature, answers) => {
      await expectContextParity(feature, answers)
    }
  )

  test.each([
    ['commodity search', commoditiesSearch],
    ['commodity quantities', consignmentDetails],
    ['multi-line, multi-unit animal identification', animalIdentification]
  ])(
    'Should match the current name-keyed %s context',
    async (_name, feature) => {
      await expectContextParity(feature)
    }
  )

  test('Should match the current documents context including upload metadata', async () => {
    await expectContextParity(documents)
  })

  test('Should match the current hub context', async () => {
    await expectContextParity(hub)
  })

  test('Should match the current check-your-answers context', async () => {
    await expectContextParity(checkAnswers)
  })
})
