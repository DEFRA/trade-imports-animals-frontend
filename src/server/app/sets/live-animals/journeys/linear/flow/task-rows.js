import { NA, statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { originPage } from '../features/origin/page.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { hasAnIdentifierField } from '../features/commodities/animal-identification/identifier/fields.js'
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

export const anyLineHasAnIdentifierField = (answers) =>
  (Array.isArray(answers?.commodityLines) ? answers.commodityLines : []).some(
    (line) => hasAnIdentifierField(line.commodityCode, line.speciesLatinName)
  )

export const taskRows = [
  { id: 'origin', pages: [originPage] },
  {
    id: 'commodities',
    pages: [commoditiesPage],
    parts: [
      {
        collection: 'commodityLines',
        except: [
          'animalIdentifiers',
          'numberOfAnimalsQuantity',
          'numberOfPackages'
        ]
      }
    ]
  },
  { id: 'importReason', pages: [importReasonPage] },
  {
    id: 'consignmentDetails',
    pages: [consignmentDetailsPage],
    parts: [
      {
        collection: 'commodityLines',
        only: ['numberOfAnimalsQuantity', 'numberOfPackages']
      }
    ]
  },
  {
    id: 'animalIdentification',
    pages: [animalIdentificationPage],
    parts: [{ collection: 'commodityLines', only: ['animalIdentifiers'] }],
    conditional: true,
    applies: anyLineHasAnIdentifierField
  },
  { id: 'additionalDetails', pages: [additionalDetailsPage] },
  { id: 'arrivalDetails', pages: [portOfEntryPage] },
  { id: 'transitCountries', pages: [transitCountriesPage], conditional: true },
  { id: 'transporter', pages: [transportersPage] },
  { id: 'documents', pages: [documentsPage] },
  { id: 'addresses', pages: [addressesPage, cphNumberPage] },
  { id: 'contact', pages: [consignmentContactSelectPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

const rowApplies = (row, answers) => row.applies?.(answers) ?? true

export const rowStatus = (row, answers, inScope, evaluation) =>
  rowApplies(row, answers)
    ? statusOf(rowParts(row), answers, inScope, evaluation)
    : NA
