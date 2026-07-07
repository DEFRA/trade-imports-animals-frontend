import { dashboardPage } from '../features/dashboard/page.js'
import { originPage } from '../features/origin/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
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
    pages: [importReasonPage]
  },
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

export const allFlowPages = sections.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id }))
)

export const sectionOfPage = (pageId) =>
  sections.find((section) => section.pages.some((page) => page.id === pageId))

export const nonQuoteSections = sections.filter(
  (section) => section.id !== 'get-your-quote'
)
