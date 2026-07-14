import { BASE, pagePath, startPath } from '../config.js'
import { isAnswered } from '../lib/answered.js'
import { currentJourney } from '../engine/journey.js'
import { registry } from '../registry.js'
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

/** Only an answer the USER entered starts a journey.
 *
 * `importType` is the filter's own service-routing pick, not notification
 * data — and it is the one answer that does not survive a real-mode
 * round-trip. Keys that are not page-collected obligations belong to the
 * backend, not the user: in real mode `answers` is rebuilt from the stored
 * notification on every load, so a freshly-created DRAFT arrives already
 * carrying its server-minted referenceNumber. Counting either would make
 * stub and real mode diverge. */
const userEntered = (key) => {
  if (key === importType.id) return false
  const obligation = registry.byId(key)
  return obligation !== undefined && !obligation.system
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
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
