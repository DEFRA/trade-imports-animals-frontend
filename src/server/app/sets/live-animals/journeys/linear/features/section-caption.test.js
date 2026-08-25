import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { stubH, journeyRequest } from '../../../../../engine/test-support.js'
import { characterisationCorpus } from '../fixtures/characterisation-corpus.js'
import { dispatchPages } from './index.js'

import { routes as dashboardRoutes } from './dashboard/controller.js'
import { routes as originRoutes } from './origin/controller.js'
import { routes as commoditiesSearchRoutes } from './commodities/search/search.controller.js'
import { routes as consignmentDetailsRoutes } from './commodities/consignment-details/consignment-details.controller.js'
import { routes as animalIdentificationRoutes } from './commodities/animal-identification/animal-identification.controller.js'
import { routes as importReasonRoutes } from './import-reason/controller.js'
import { routes as importPurposeRoutes } from './import-purpose/controller.js'
import { routes as destinationCountryRoutes } from './destination-country/controller.js'
import { routes as portOfExitRoutes } from './port-of-exit/controller.js'
import { routes as exitDateRoutes } from './exit-date/controller.js'
import { routes as additionalDetailsRoutes } from './additional-details/controller.js'
import { routes as addressesRoutes } from './addresses/controller.js'
import { routes as cphNumberRoutes } from './cph-number/controller.js'
import { routes as transitCountriesRoutes } from './transport/transit-countries/transit-countries.controller.js'
import { routes as portOfEntryRoutes } from './transport/port-of-entry/port-of-entry.controller.js'
import { routes as transportersRoutes } from './transport/transporters/transporters.controller.js'
import { routes as transportersSelectRoutes } from './transport/transporters-select/transporters-select.controller.js'
import { routes as privateTransporterDetailsRoutes } from './transport/private-transporter-details/private-transporter-details.controller.js'
import { routes as documentsRoutes } from './documents/controller.js'
import { routes as hubRoutes } from './hub/controller.js'
import { routes as checkAnswersRoutes } from './check-answers/controller.js'
import { routes as contactRoutes } from './contact/controller.js'
import { routes as declarationRoutes } from './declaration/controller.js'

const comprehensive = characterisationCorpus.find(
  ({ name }) => name === 'comprehensive'
).answers

const parityFixture = structuredClone(comprehensive)
for (const flowOrOutOfScope of [
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

const ABOUT_THE_CONSIGNMENT = 'About the consignment'
const CONSIGNMENT_PARTIES = 'Consignment parties'
const TRANSPORT_AND_ARRIVAL = 'Transport and arrival'
const NEW_TRANSPORTER = 'Add a new transporter'

const getHandlerOf = (routes) =>
  routes.find((route) => route.method === 'GET').handler

const renderOf = async (routes, answers = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, answers)
  const h = stubH()
  await getHandlerOf(routes)(journeyRequest(journey.journeyId), h)
  return h.captured.view
}

const SETS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../'
)
const templateSourceOf = (view) =>
  readFileSync(path.join(SETS_ROOT, `${view}.njk`), 'utf8')

// Every page the caption map names, with the section it must show. One case
// per page, so a page that loses its `page` argument or its template call
// names itself in the failure.
const CAPTIONED_PAGES = [
  ['dashboard', 'Dashboard', dashboardRoutes, {}],
  ['origin', ABOUT_THE_CONSIGNMENT, originRoutes, parityFixture],
  [
    'commodity search',
    ABOUT_THE_CONSIGNMENT,
    commoditiesSearchRoutes,
    parityFixture
  ],
  [
    'consignment details',
    ABOUT_THE_CONSIGNMENT,
    consignmentDetailsRoutes,
    parityFixture
  ],
  [
    'animal identification',
    ABOUT_THE_CONSIGNMENT,
    animalIdentificationRoutes,
    parityFixture
  ],
  ['import reason', ABOUT_THE_CONSIGNMENT, importReasonRoutes, parityFixture],
  ['import purpose', ABOUT_THE_CONSIGNMENT, importPurposeRoutes, parityFixture],
  [
    'destination country',
    ABOUT_THE_CONSIGNMENT,
    destinationCountryRoutes,
    transitFixture
  ],
  ['port of exit', ABOUT_THE_CONSIGNMENT, portOfExitRoutes, transitFixture],
  [
    'exit date',
    ABOUT_THE_CONSIGNMENT,
    exitDateRoutes,
    temporaryAdmissionFixture
  ],
  [
    'additional details',
    'Commodity details',
    additionalDetailsRoutes,
    parityFixture
  ],
  ['addresses', CONSIGNMENT_PARTIES, addressesRoutes, parityFixture],
  ['CPH number', CONSIGNMENT_PARTIES, cphNumberRoutes, parityFixture],
  ['transit countries', 'Movement', transitCountriesRoutes, parityFixture],
  ['port of entry', TRANSPORT_AND_ARRIVAL, portOfEntryRoutes, parityFixture],
  ['transporters', TRANSPORT_AND_ARRIVAL, transportersRoutes, parityFixture],
  [
    'transporters select',
    NEW_TRANSPORTER,
    transportersSelectRoutes,
    parityFixture
  ],
  [
    'private transporter details',
    NEW_TRANSPORTER,
    privateTransporterDetailsRoutes,
    privateTransportFixture
  ],
  ['documents', 'Documents', documentsRoutes, parityFixture]
]

// Design release 1 opens these pages straight into their heading.
const BARE_PAGES = [
  ['overview', hubRoutes],
  ['check your answers', checkAnswersRoutes],
  ['contact', contactRoutes],
  ['declaration', declarationRoutes]
]

describe('section caption — the view model names the section', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it.each(CAPTIONED_PAGES)(
    'Should caption the %s page "%s" and render it in its template',
    async (_name, expected, routes, answers) => {
      const view = await renderOf(routes, answers)

      expect(view.context.caption).toBe(expected)
      expect(templateSourceOf(view.view)).toContain('sectionCaption(caption')
    }
  )

  it.each(BARE_PAGES)(
    'Should leave the %s page uncaptioned',
    async (_name, routes) => {
      const view = await renderOf(routes, parityFixture)

      expect(view.context.caption).toBeUndefined()
      expect(templateSourceOf(view.view)).not.toContain('sectionCaption(')
    }
  )
})
