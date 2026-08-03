// Scaffolded by docs/add-a-set.md step 3.
import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { commodityAdditionalDetailsPage } from '../features/additional-details/page.js'
import {
  commodityBasicDescriptionPage,
  commodityBulkDetailsPage,
  commodityInputMethodPage,
  commoditySearchPage,
  commoditySummaryPage,
  varietyOfGenusAndSpeciesPage
} from '../features/commodities/page.js'
import {
  countryOfOriginPage,
  originOfImportPage
} from '../features/origin/page.js'
import { purposePage } from '../features/purpose/page.js'
import { goodsMovementServicesPage } from '../features/goods-movement/page.js'
import { transportBeforeBipPage } from '../features/transport/page.js'
import { accompanyingDocumentsPage } from '../features/documents/page.js'
import { contactDetailsPage } from '../features/contact/page.js'
import {
  consignorConfirmationPage,
  consignorCreatePage,
  tradersAddressesPage
} from '../features/traders/page.js'

export const taskRows = [
  { id: 'origin', pages: [countryOfOriginPage, originOfImportPage] },
  { id: 'purpose', pages: [purposePage] },
  {
    id: 'commodities',
    pages: [
      commodityInputMethodPage,
      commoditySearchPage,
      commodityBasicDescriptionPage,
      varietyOfGenusAndSpeciesPage,
      commoditySummaryPage,
      commodityBulkDetailsPage
    ]
  },
  {
    id: 'additional-details',
    pages: [commodityAdditionalDetailsPage]
  },
  { id: 'transport', pages: [transportBeforeBipPage] },
  { id: 'goods-movement', pages: [goodsMovementServicesPage] },
  { id: 'contact', pages: [contactDetailsPage] },
  { id: 'documents', pages: [accompanyingDocumentsPage] },
  {
    id: 'traders',
    pages: [
      tradersAddressesPage,
      consignorCreatePage,
      consignorConfirmationPage
    ]
  }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)
