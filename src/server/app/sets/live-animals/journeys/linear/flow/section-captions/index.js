import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { dashboardPage } from '../../features/dashboard/page.js'
import { originPage } from '../../features/origin/page.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../../features/commodities/page.js'
import { importReasonPage } from '../../features/import-reason/page.js'
import { additionalDetailsPage } from '../../features/additional-details/page.js'
import { addressesPage } from '../../features/addresses/page.js'
import { cphNumberPage } from '../../features/cph-number/page.js'
import {
  commercialTransporterDetailsPage,
  portOfEntryPage,
  privateTransporterDetailsPage,
  transitCountriesPage,
  transporterAddPage,
  transportersPage,
  transportersSelectPage
} from '../../features/transport/page.js'
import { documentsPage } from '../../features/documents/page.js'

const copy = copyFor({ en, cy })

export const captionSections = [
  { id: 'dashboard', pages: [dashboardPage] },
  {
    id: 'aboutTheConsignment',
    pages: [
      originPage,
      commoditiesPage,
      animalIdentificationPage,
      importReasonPage
    ]
  },
  { id: 'descriptionOfTheGoods', pages: [consignmentDetailsPage] },
  { id: 'additionalDetails', pages: [additionalDetailsPage] },
  { id: 'consignmentParties', pages: [addressesPage, cphNumberPage] },
  { id: 'movement', pages: [transitCountriesPage] },
  { id: 'transportAndArrival', pages: [portOfEntryPage, transportersPage] },
  {
    id: 'newTransporter',
    pages: [
      transporterAddPage,
      transportersSelectPage,
      commercialTransporterDetailsPage,
      privateTransporterDetailsPage
    ]
  },
  { id: 'documents', pages: [documentsPage] }
]

const sectionIdByPageId = new Map(
  captionSections.flatMap((section) =>
    section.pages.map((page) => [page.id, section.id])
  )
)

/**
 * The caption a page renders above its heading.
 *
 * @param {string} [pageId] - the page identity's `id`.
 * @returns {string|undefined} the section name, or undefined for a page that
 * carries no caption.
 */
export const sectionCaptionOf = (pageId) => {
  const sectionId = sectionIdByPageId.get(pageId)
  return sectionId ? copy.sections[sectionId] : undefined
}
