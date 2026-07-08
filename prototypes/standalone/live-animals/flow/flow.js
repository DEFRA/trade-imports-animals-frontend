import { dashboardPage } from '../features/dashboard/page.js'
import { originPage } from '../features/origin/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { importPurposePage } from '../features/import-purpose/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
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
    pages: [importReasonPage, importPurposePage]
  },
  {
    id: 'documents',
    pages: [documentsPage]
  },
  {
    id: 'addresses',
    pages: [addressesPage]
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
  // "Check and submit" (c-022 end shape: hub -> check your answers ->
  // declaration -> submitted). No gate: the CYA collects nothing and the
  // declaration obligation is always-live, so the section derives reachable
  // from the start — a review you can always visit.
  {
    id: 'review',
    pages: [notificationViewPage, declarationPage]
  }
]

export const allFlowPages = sections.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id }))
)

export const sectionOfPage = (pageId) =>
  sections.find((section) => section.pages.some((page) => page.id === pageId))

// The authored `get-your-quote` gate — the last car-domain section and the
// only `gate:` this flow ever carried — was removed in inc-028. `readyForQuote`
// (flow/section-status.js) survives as ENGINE/FLOW machinery: it is the LIVE
// submit-readiness gate consulted by `submitJourney` (engine/write.js), NOT a
// section gate any more. With no quote section to exclude, this set now spans
// every section, so the roll-up asks "is every section fulfilled or NA" — the
// exact submit precondition. Kept as-is (name + filter) rather than renamed:
// the capability is supported, not dead. See docs/flow-and-gates.md.
export const nonQuoteSections = sections.filter(
  (section) => section.id !== 'get-your-quote'
)
