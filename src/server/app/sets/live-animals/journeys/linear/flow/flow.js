import { dashboardPage } from '../features/dashboard/page.js'
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
import { permanentAddressPage } from '../features/permanent-address/page.js'
import {
  portOfEntryPage,
  transitCountriesPage,
  transportersPage
} from '../features/transport/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { confirmationPage } from '../features/confirmation/page.js'
import { STORED_SEARCH_ROWS } from '../features/commodities/search/selection/rows.js'
import {
  JUST_ADDED_TRANSPORTER_NAME,
  TRANSPORTER_ADD_IN_PROGRESS,
  TRANSPORTER_TYPE_CHOSEN,
  TRANSPORTER_TYPE_RESTART
} from '../features/transport/transporter-add-session.js'

export const FLOW_ONLY_KEYS = [
  'declaration',
  STORED_SEARCH_ROWS,
  TRANSPORTER_ADD_IN_PROGRESS,
  JUST_ADDED_TRANSPORTER_NAME,
  TRANSPORTER_TYPE_RESTART,
  TRANSPORTER_TYPE_CHOSEN
]

export const sections = [
  {
    id: 'start',
    pages: [dashboardPage]
  },
  {
    id: 'about-the-consignment',
    pages: [originPage, commoditiesPage, importReasonPage]
  },
  {
    id: 'description-of-the-goods',
    pages: [
      consignmentDetailsPage,
      animalIdentificationPage,
      additionalDetailsPage
    ]
  },
  {
    id: 'transport-and-arrival',
    pages: [portOfEntryPage, transitCountriesPage, transportersPage]
  },
  {
    id: 'documents',
    pages: [documentsPage]
  },
  {
    id: 'consignment-parties',
    pages: [cphNumberPage, permanentAddressPage, addressesPage]
  },
  {
    id: 'contact-address',
    pages: [consignmentContactSelectPage]
  },
  {
    id: 'review',
    gate: (scope) => scope.readyForCheckYourAnswers,
    pages: [notificationViewPage, declarationPage, confirmationPage]
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
