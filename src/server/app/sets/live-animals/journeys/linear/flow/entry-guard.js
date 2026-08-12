import { BASE, createPath, pagePath } from '../../../../../shared/paths.js'
import { isAnswered } from '../../../../../lib/answered.js'
import { get } from '../../../../../engine/read.js'
import {
  obligationByName,
  SYSTEM_POPULATED
} from '../../../../../bridge/obligation-source.js'
import { originPage } from '../features/origin/page.js'
import { openingRunStarted } from '../../../../../flow/run-state.js'

const JOURNEY_PREFIX = `${BASE}/notifications/`
const ACTION_SLUGS = new Set(['amend', 'cancel-amend', 'copy', 'delete'])

export const guardedJourneyPath = (path) => {
  if (!path.startsWith(JOURNEY_PREFIX) || path === createPath()) {
    return false
  }
  const [journeyId, ...slugParts] = path.slice(JOURNEY_PREFIX.length).split('/')
  const slug = slugParts.join('/')
  if (ACTION_SLUGS.has(slug)) {
    return false
  }
  const isEntrySurface =
    slug === originPage.slug || slug.startsWith(`${originPage.slug}/`)
  return Boolean(journeyId) && !isEntrySurface
}

/** Only a model answer the USER entered starts a journey. System populated
 * obligations do not represent user progress, and flow-only keys such as
 * `declaration` are session state rather than canonical fulfilment, so they
 * never resolve to a manifest obligation. */
const userEntered = (key) => {
  const obligation = obligationByName(key)
  return obligation !== undefined && !SYSTEM_POPULATED.has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

/** Deep-link guard: a fresh journey asking for a page beyond the entry is sent
 * to the entry page (see docs/flow-and-gates.md, "The opening run"). */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) {
    return null
  }
  const { journey, answers } = await get(request, h)
  if (await openingRunStarted(request, journey.journeyId)) {
    return null
  }
  if (hasCommittedNotificationAnswers(answers)) {
    return null
  }
  return pagePath(request.params.journeyId, originPage.slug)
}
