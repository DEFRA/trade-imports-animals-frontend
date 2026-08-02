// Scaffolded by docs/add-a-set.md step 3.
import { dashboardPage } from '../features/dashboard/page.js'
import { importTypePage } from '../features/import-type/page.js'

export const FLOW_ONLY_KEYS = ['importType', 'declaration']

export const sections = [
  {
    id: 'start',
    pages: [dashboardPage, importTypePage]
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
