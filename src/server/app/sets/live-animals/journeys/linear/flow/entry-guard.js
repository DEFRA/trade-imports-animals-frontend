import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath,
  setBase
} from '../../../../../shared/paths.js'
import { isAnswered } from '../../../../../lib/answered.js'
import { get } from '../../../../../engine/read.js'
import { SYSTEM_POPULATED } from '../../../../../bridge/obligation-source.js'
import { obligationByName } from '../../../../../model/obligations/manifest.js'
import { originPage } from '../features/origin/page.js'
import {
  inOpeningRun,
  openingRunStarted
} from '../../../../../flow/run-state.js'

const journeyPrefix = () => `${setBase()}/notifications/`
const ACTION_SLUGS = new Set(['amend', 'cancel-amend', 'copy', 'delete'])

export const guardedJourneyPath = (path) => {
  const prefix = journeyPrefix()
  if (!path.startsWith(prefix) || path === createPath()) {
    return false
  }
  const [journeyId, ...slugParts] = path.slice(prefix.length).split('/')
  const slug = slugParts.join('/')
  if (ACTION_SLUGS.has(slug)) {
    return false
  }
  const isEntrySurface =
    slug === originPage.slug || slug.startsWith(`${originPage.slug}/`)
  return Boolean(journeyId) && !isEntrySurface
}

const userEntered = (key) => {
  const obligation = obligationByName(key)
  return obligation !== undefined && !SYSTEM_POPULATED.has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

const overviewAdmitsRequest = async (request, journey, answers) =>
  (await openingRunStarted(request, journey.journeyId)) ||
  hasCommittedNotificationAnswers(answers)

export const entryBackLink = async (request, journey, answers) => {
  if (await inOpeningRun(request, journey.journeyId)) {
    return dashboardPath()
  }
  return (await overviewAdmitsRequest(request, journey, answers))
    ? hubPath(journey.journeyId)
    : dashboardPath()
}

/** Deep-link guard: a journey the overview would not admit is sent to the
 * entry page. Returns that page's path, or null when the request may proceed. */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) {
    return null
  }
  const { journey, answers } = await get(request, h)
  if (await overviewAdmitsRequest(request, journey, answers)) {
    return null
  }
  return pagePath(request.params.journeyId, originPage.slug)
}
