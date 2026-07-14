import { BASE, pagePath, startPath } from '../config.js'
import { isAnswered } from '../lib/answered.js'
import { currentJourney } from '../engine/journey.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { importTypeFilterPage } from '../features/import-type-filter/page.js'
import { importType } from '../features/import-type-filter/obligations.js'
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

/** The filter's own service-routing answer never counts as a start — it is
 * also the one answer that does not survive a real-mode round-trip. */
export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => key !== importType.id && isAnswered(value)
  )

/** Deep-link guard: a fresh journey asking for a post-filter page is sent
 * to the entry filter (see docs/flow-and-gates.md, "The opening run"). */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) return null
  const journey = await currentJourney(request, h)
  if (await hasEnteredThroughFilter(request, journey.journeyId)) return null
  if (hasCommittedNotificationAnswers(journey.answers)) return null
  return pagePath(importTypeFilterPage.slug)
}
