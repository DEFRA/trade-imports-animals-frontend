import { emailPage } from '../features/email/page.js'
import { aboutYouPage } from '../features/about-you/page.js'
import { yourVehiclePage } from '../features/your-vehicle/page.js'
import { drivingHistoryPage } from '../features/driving-history/page.js'
import { claimsPage } from '../features/claims/page.js'
import { coverTypePage } from '../features/cover-type/page.js'
import { optionalExtrasPage } from '../features/optional-extras/page.js'
import { addonsPage } from '../features/addons/page.js'
import { driversPage } from '../features/named-driver/page.js'
import {
  modificationsDescribePage,
  modificationsValuePage
} from '../features/modifications/page.js'
import { protectedNcdYearsPage } from '../features/protected-ncd/page.js'
import { quoteSummaryPage } from '../features/quote/page.js'

/**
 * The Flow — an ordered section -> pages structure. It owns SEQUENCE and
 * GATING only: no copy, no headings, no validation, no template choice
 * (those live per-page). Section grouping survives from v1 (lighter and
 * copy-free) because the journey returns to the hub after each section and
 * the hub renders one task per section.
 *
 * Gating is DERIVED BY DEFAULT: a section or page with no `gate` is
 * reachable exactly when some obligation it collects is in scope (see
 * `flow/gates.js`), so the flow never restates the model's activation rules
 * as hand-typed `inScope.has('<key>')` strings. An authored `gate` is the
 * OVERRIDE for flow-level facts the model cannot express; it is a PURE read
 * of the scope facts the state layer already computed (`scope.inScope` /
 * `scope.readyForQuote`) — the flow never re-derives scope or mutates data.
 * The one authored gate is `get-your-quote`'s readiness roll-up.
 */
export const sections = [
  {
    id: 'email',
    pages: [emailPage]
  },
  {
    id: 'about-you-and-your-vehicle',
    pages: [aboutYouPage, yourVehiclePage]
  },
  {
    id: 'your-driving-and-cover',
    pages: [drivingHistoryPage, claimsPage, coverTypePage, optionalExtrasPage]
  },
  {
    id: 'add-to-your-policy',
    pages: [addonsPage]
  },
  {
    id: 'named-driver',
    dynamic: true,
    pages: [driversPage]
  },
  {
    id: 'modifications',
    dynamic: true,
    pages: [modificationsDescribePage, modificationsValuePage]
  },
  {
    id: 'protected-ncd',
    dynamic: true,
    pages: [protectedNcdYearsPage]
  },
  {
    id: 'get-your-quote',
    gate: (scope) => scope.readyForQuote,
    pages: [quoteSummaryPage]
  }
]

/** Every page across all sections, flattened (order preserved). */
export const allFlowPages = sections.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id }))
)

export const sectionOfPage = (pageId) =>
  sections.find((section) => section.pages.some((page) => page.id === pageId))

/** Sections that must be complete for the quote to unlock (all but the quote itself). */
export const nonQuoteSections = sections.filter(
  (section) => section.id !== 'get-your-quote'
)
