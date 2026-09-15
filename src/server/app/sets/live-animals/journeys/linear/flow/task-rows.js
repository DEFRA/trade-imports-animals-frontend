import { NA, statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { identifiedCommodities } from '../../../services/commodities/index.js'
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

// Design release 1 puts the identification task on the hub only once a chosen
// commodity carries an identifier of its own, and leaves it off the page
// entirely until then: on a notification with nothing chosen there is nothing
// to identify, so an empty locked row would be an instruction the trader
// cannot act on.
//
// The row cannot read this off its status roll-up. Its part is the
// `commodityLines` collection, a structural group that is in scope from the
// moment the notification exists, so `statusOf` never reaches Not applicable
// and `conditional: true` alone would leave the row drawn. It carries its own
// applicability test instead — the same question the identification page asks
// before it redirects a trader straight past itself.
const identifiesAnAnimal = (answers) =>
  (Array.isArray(answers?.commodityLines) ? answers.commodityLines : []).some(
    (line) => identifiedCommodities().includes(line?.commoditySelection)
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
  { id: 'importReason', pages: [importReasonPage] },
  { id: 'additionalDetails', pages: [additionalDetailsPage] },
  {
    id: 'animalIdentification',
    pages: [animalIdentificationPage],
    parts: [{ collection: 'commodityLines', only: ['animalIdentifiers'] }],
    conditional: true,
    applies: identifiesAnAnimal
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

// A row with no `applies` test is always applicable; one that answers no is
// Not applicable however its parts roll up, which is what lets a `conditional`
// row leave the hub and stand down as submit-readiness work.
const rowApplies = (row, answers) => row.applies?.(answers) ?? true

export const rowStatus = (row, answers, inScope, evaluation) =>
  rowApplies(row, answers)
    ? statusOf(rowParts(row), answers, inScope, evaluation)
    : NA
