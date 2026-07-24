import { BASE, createPath, pagePath } from '../config.js'
import { isAnswered } from '../lib/answered.js'
import { get } from '../engine/read.js'
import { obligationByName, SYSTEM_POPULATED } from './obligation-source.js'
import { importTypeFilterPage } from '../features/import-type-filter/page.js'
import { hasEnteredThroughFilter } from './run-state.js'

const IMPORT_TYPE_KEY = 'importType'

const JOURNEY_PREFIX = `${BASE}/notifications/`

export const guardedJourneyPath = (path) => {
  if (!path.startsWith(JOURNEY_PREFIX) || path === createPath()) return false
  const [journeyId, ...slugParts] = path.slice(JOURNEY_PREFIX.length).split('/')
  const slug = slugParts.join('/')
  const isEntrySurface =
    slug === importTypeFilterPage.slug ||
    slug.startsWith(`${importTypeFilterPage.slug}/`)
  return Boolean(journeyId) && !isEntrySurface
}

/** Only a model answer the USER entered starts a journey.
 *
 * `importType` is flow-only session state, not canonical fulfilment. System
 * populated obligations do not represent user progress either. */
const userEntered = (key) => {
  if (key === IMPORT_TYPE_KEY) return false
  const obligation = obligationByName(key)
  return obligation !== undefined && !SYSTEM_POPULATED.has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

/** Deep-link guard: a fresh journey asking for a post-filter page is sent
 * to the entry filter (see docs/flow-and-gates.md, "The opening run"). */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) return null
  const { journey, answers } = await get(request, h)
  if (await hasEnteredThroughFilter(request, journey.journeyId)) return null
  if (hasCommittedNotificationAnswers(answers)) return null
  return pagePath(request.params.journeyId, importTypeFilterPage.slug)
}
