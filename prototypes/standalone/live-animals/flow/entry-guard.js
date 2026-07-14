import { BASE, pagePath, startPath } from '../config.js'
import { isAnswered } from '../lib/answered.js'
import { currentJourney } from '../engine/journey.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { importTypeFilterPage } from '../features/import-type-filter/page.js'
import { hasEnteredThroughFilter } from './run-state.js'

const EXEMPT_PREFIXES = [
  pagePath(dashboardPage.slug),
  pagePath(importTypeFilterPage.slug),
  startPath()
]

export const guardedJourneyPath = (path) =>
  path.startsWith(`${BASE}/`) &&
  !EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )

export const hasCommittedAnswers = (answers) =>
  Object.values(answers ?? {}).some(isAnswered)

/** Deep-link guard: a fresh journey asking for a post-filter page is sent
 * to the entry filter (see docs/flow-and-gates.md, "The opening run"). */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) return null
  const journey = await currentJourney(request, h)
  if (await hasEnteredThroughFilter(request, journey.journeyId)) return null
  if (hasCommittedAnswers(journey.answers)) return null
  return pagePath(importTypeFilterPage.slug)
}
