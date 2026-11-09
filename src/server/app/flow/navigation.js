import { pagePath } from '../shared/paths.js'
import { pageGatePasses, pageAppliesTo } from './gates.js'
import { journeySections, journeyTaskRows } from './journey-flow.js'
import { earliestMissingAnswerPage } from './prerequisites.js'

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

/**
 * The path of the page that asks for a missing required earlier answer.
 *
 * @param {{ askingPageId: string }} missing - what `earliestMissingAnswerPage` found.
 * @param {string} journeyId - the journey being worked on.
 * @returns {string} the asking page's path.
 */
export const askingPagePath = (missing, journeyId) => {
  const asking = flowPages().find((page) => page.id === missing.askingPageId)
  return pagePath(journeyId, asking.slug)
}

const landingOnAskingPage = (next, missing, journeyId) => ({
  path: askingPagePath(missing, journeyId),
  unopened: { pageId: next.id, missingAnswerIds: missing.missingAnswerIds }
})

/**
 * Where Save and continue lands after a page.
 *
 * @param {string} pageId - the page saved.
 * @param {object} scope - the journey's scope.
 * @param {string} journeyId - the journey being worked on.
 * @returns {{ path: string, unopened?: { pageId: string, missingAnswerIds: string[] } }|undefined}
 * the next page that applies when the journey offers it, else the page that
 * asks for the earliest missing required earlier answer, with the unopened
 * page and every missing answer id. Undefined past the last step.
 * @throws {Error} when the page is in no section.
 */
export const nextStepLanding = (pageId, scope, journeyId) => {
  const pages = flowPages()
  const index = pages.findIndex((page) => page.id === pageId)
  if (index === -1) {
    throw new Error(`Page '${pageId}' is not in the journey's sections`)
  }
  const next = pages
    .slice(index + 1)
    .filter(isStep)
    .find((page) => pageAppliesTo(page, scope))
  if (!next) {
    return undefined
  }
  const missing = next.gate
    ? undefined
    : earliestMissingAnswerPage(next.id, scope)
  if (!missing) {
    return { path: pagePath(journeyId, next.slug) }
  }
  return landingOnAskingPage(next, missing, journeyId)
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
