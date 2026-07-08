import { dashboardPage } from '../features/dashboard/page.js'
import { originPage } from '../features/origin/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { importPurposePage } from '../features/import-purpose/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
import { cphNumberPage } from '../features/cph-number/page.js'
import {
  portOfEntryPage,
  privateTransporterDetailsPage,
  transportDetailsPage,
  transportersPage,
  transportersSelectPage
} from '../features/transport/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { declarationPage } from '../features/declaration/page.js'

export const sections = [
  {
    id: 'start',
    pages: [dashboardPage]
  },
  {
    id: 'origin',
    pages: [originPage]
  },
  {
    id: 'commodities',
    pages: [commoditiesPage]
  },
  {
    id: 'consignment',
    pages: [importReasonPage, importPurposePage, additionalDetailsPage]
  },
  {
    id: 'documents',
    pages: [documentsPage]
  },
  {
    id: 'addresses',
    pages: [addressesPage, cphNumberPage]
  },
  {
    id: 'transport',
    pages: [
      portOfEntryPage,
      transportDetailsPage,
      transportersPage,
      transportersSelectPage,
      privateTransporterDetailsPage
    ]
  },
  {
    id: 'contact',
    pages: [consignmentContactSelectPage]
  },
  {
    id: 'review',
    gate: (scope) => scope.readyForCheckYourAnswers,
    pages: [notificationViewPage, declarationPage]
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
