// Scaffolded by docs/add-a-set.md step 3.
import { commodityAdditionalDetailsPage } from '../features/additional-details/page.js'
import { dashboardPage } from '../features/dashboard/page.js'
import {
  commodityBasicDescriptionPage,
  commodityBulkDetailsPage,
  commodityInputMethodPage,
  commoditySearchPage,
  commoditySummaryPage,
  varietyOfGenusAndSpeciesPage
} from '../features/commodities/page.js'
import { importTypePage } from '../features/import-type/page.js'
import { goodsMovementServicesPage } from '../features/goods-movement/page.js'
import { accompanyingDocumentsPage } from '../features/documents/page.js'
import { contactDetailsPage } from '../features/contact/page.js'
import {
  countryOfOriginPage,
  originOfImportPage
} from '../features/origin/page.js'
import { purposePage } from '../features/purpose/page.js'
import { transportBeforeBipPage } from '../features/transport/page.js'
import { tradersAddressesPage } from '../features/traders/page.js'

export const FLOW_ONLY_KEYS = ['importType', 'declaration']

export const sections = [
  {
    id: 'start',
    pages: [dashboardPage, importTypePage]
  },
  {
    id: 'origin',
    pages: [countryOfOriginPage, originOfImportPage]
  },
  {
    id: 'purpose',
    pages: [purposePage]
  },
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
  {
    id: 'transport',
    pages: [transportBeforeBipPage]
  },
  {
    id: 'goods-movement',
    pages: [goodsMovementServicesPage]
  },
  {
    id: 'contact',
    pages: [contactDetailsPage]
  },
  {
    id: 'documents',
    pages: [accompanyingDocumentsPage]
  },
  {
    id: 'traders',
    pages: [tradersAddressesPage]
  },
  {
    id: 'review',
    gate: (scope) => scope.readyForCheckYourAnswers,
    pages: []
  }
]

export const allFlowPages = sections.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id }))
)

export const sectionOfPage = (pageId) =>
  sections.find((section) => section.pages.some((page) => page.id === pageId))

export const answerSections = sections.filter(
  (section) => section.id !== 'review'
)
