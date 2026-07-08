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
    // cphNumber is a conditionally-scoped tail page (frame:"anyItem" on a
    // commodity line) — walked after the addresses landing when a CPH
    // commodity is in the lines, skipped otherwise (the derived gate). The
    // party-select spokes stay routes-only and never join this array.
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
  // "Check and submit" (c-022 end shape: hub -> check your answers ->
  // declaration -> submitted). Authored gate: the review section is reachable
  // only once every answer-gathering section is submit-ready. It CANNOT derive
  // this from collects — the section's own `declaration` obligation is
  // always-in-scope, so a derived gate would open it from the start; and gating
  // it on the full submit-readiness roll-up would deadlock (you confirm the
  // declaration inside the very section it gates), which is why
  // `readyForCheckYourAnswers` excludes this section. See docs/flow-and-gates.md.
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

// The sections `readyForCheckYourAnswers` (flow/section-status.js) rolls up:
// every answer-gathering section EXCEPT `review`. Review is excluded because it
// owns the `declaration` obligation, confirmed inside the review section
// itself — folding it into the readiness roll-up that GATES review would
// deadlock. Submit safety is unaffected: the declaration page's own validator
// enforces `declaration === 'confirmed'` before `submitJourney` runs. See
// docs/flow-and-gates.md.
export const answerSections = sections.filter(
  (section) => section.id !== 'review'
)
