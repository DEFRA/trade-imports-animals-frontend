import { pagePath } from '../shared/paths.js'
import { pageGatePasses, pageAppliesTo } from './gates.js'
import { journeySections, journeyTaskRows } from './journey-flow.js'

const flowPages = () => journeySections().flatMap((section) => section.pages)

const belongsToTaskRow = (page) =>
  journeyTaskRows().some((row) =>
    row.pages.some((rowPage) => rowPage.id === page.id)
  )

const isStep = (page) => !page.subPage && belongsToTaskRow(page)

export const rowEntry = (row, scope, journeyId) => {
  const page =
    row.pages.find((candidate) => pageGatePasses(candidate, scope)) ??
    row.pages[0]
  return pagePath(journeyId, page.slug)
}

export const nextStepPath = (pageId, scope, journeyId) => {
  const pages = flowPages()
  const index = pages.findIndex((page) => page.id === pageId)
  if (index === -1) {
    throw new Error(`Page '${pageId}' is not in the journey's sections`)
  }
  const next = pages
    .slice(index + 1)
    .filter(isStep)
    .find((page) => pageAppliesTo(page, scope))
  return next ? pagePath(journeyId, next.slug) : undefined
}

const firstPageIndexIn = (section, row) =>
  section.pages.findIndex((page) => page.id === row.pages[0].id)

export const taskRowsOfSection = (section) =>
  journeyTaskRows()
    .filter((row) => firstPageIndexIn(section, row) !== -1)
    .sort(
      (rowA, rowB) =>
        firstPageIndexIn(section, rowA) - firstPageIndexIn(section, rowB)
    )
