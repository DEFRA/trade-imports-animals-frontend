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
import { importPurposePage } from '../../features/import-purpose/page.js'
import { destinationCountryPage } from '../../features/destination-country/page.js'
import { portOfExitPage } from '../../features/port-of-exit/page.js'
import { exitDatePage } from '../../features/exit-date/page.js'
import { additionalDetailsPage } from '../../features/additional-details/page.js'
import { addressesPage } from '../../features/addresses/page.js'
import { cphNumberPage } from '../../features/cph-number/page.js'
import {
  portOfEntryPage,
  privateTransporterDetailsPage,
  transitCountriesPage,
  transportersPage,
  transportersSelectPage
} from '../../features/transport/page.js'
import { documentsPage } from '../../features/documents/page.js'

const copy = copyFor({ en, cy })

/**
 * Which section of the notification each page belongs to.
 *
 * The caption above a page heading tells someone part-way through a long
 * notification which part of it they are in, so the value is a property of
 * where the page sits in the journey, not of the page's own copy. One entry
 * per section, listing its pages — never a string per page.
 *
 * These sections are the ones the caption names, which are finer than the
 * hub's task-row groups: the hub files animal identification with the other
 * commodity work and puts every transport row under one group, while the
 * caption keeps identification with the rest of the consignment questions and
 * separates arrival, transit and adding a transporter.
 *
 * A page that is absent is deliberately bare. The overview, check-your-
 * answers, contact-address, declaration and confirmation pages open straight
 * into their heading; delete-notification and cancel-amend are interruptions
 * rather than steps in a section. The address pickers carry their own caption
 * from the addresses feature.
 */
export const captionSections = [
  { id: 'dashboard', pages: [dashboardPage] },
  {
    id: 'aboutTheConsignment',
    pages: [
      originPage,
      commoditiesPage,
      consignmentDetailsPage,
      animalIdentificationPage,
      importReasonPage,
      importPurposePage,
      destinationCountryPage,
      portOfExitPage,
      exitDatePage
    ]
  },
  { id: 'commodityDetails', pages: [additionalDetailsPage] },
  { id: 'consignmentParties', pages: [addressesPage, cphNumberPage] },
  { id: 'movement', pages: [transitCountriesPage] },
  { id: 'transportAndArrival', pages: [portOfEntryPage, transportersPage] },
  {
    id: 'newTransporter',
    pages: [transportersSelectPage, privateTransporterDetailsPage]
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
