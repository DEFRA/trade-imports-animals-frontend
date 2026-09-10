import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { originPage } from '../features/origin/page.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
import { cphNumberPage } from '../features/cph-number/page.js'
import {
  portOfEntryPage,
  transitCountriesPage,
  transportersPage
} from '../features/transport/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'

export const taskRows = [
  { id: 'origin', pages: [originPage] },
  {
    id: 'commodities',
    pages: [commoditiesPage, consignmentDetailsPage],
    parts: [{ collection: 'commodityLines', except: ['animalIdentifiers'] }]
  },
  { id: 'importReason', pages: [importReasonPage] },
  { id: 'additionalDetails', pages: [additionalDetailsPage] },
  {
    id: 'animalIdentification',
    pages: [animalIdentificationPage],
    parts: [{ collection: 'commodityLines', only: ['animalIdentifiers'] }]
  },
  { id: 'arrivalDetails', pages: [portOfEntryPage] },
  { id: 'transitCountries', pages: [transitCountriesPage], conditional: true },
  // The list declares all three transporter answers, so the row still spans
  // the type and both address blocks from the one page.
  { id: 'transporter', pages: [transportersPage] },
  { id: 'addresses', pages: [addressesPage, cphNumberPage] },
  { id: 'contact', pages: [consignmentContactSelectPage] },
  { id: 'documents', pages: [documentsPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)
