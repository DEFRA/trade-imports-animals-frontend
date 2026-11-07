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
  activeOpeningRunBeganAtStartEntry
} from '../../../../../flow/run-state.js'
import { buildInsFrontendUrl } from '../../../../../../common/helpers/ins-frontend-url.js'
import { SET_ID } from '../../../set.js'

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

export const leaveJourneyLink = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

const insTypeQuestionUrl = (journeyId) => {
  const query = new URLSearchParams({
    'notification-id': journeyId,
    'current-notification-type': SET_ID
  })
  return buildInsFrontendUrl(`/notification-type?${query.toString()}`)
}

export const entryBackLink = async (request, journey, answers) => {
  if (await activeOpeningRunBeganAtStartEntry(request, journey.journeyId)) {
    return insTypeQuestionUrl(journey.journeyId)
  }
  if (await inOpeningRun(request, journey.journeyId)) {
    return dashboardPath()
  }
  return leaveJourneyLink(journey, answers)
}

export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) {
    return null
  }
  const { journey, answers } = await get(request, h)
  if (hasCommittedNotificationAnswers(answers)) {
    return null
  }
  request.logger.info(
    { journeyId: journey.journeyId, path: request.path },
    'No answer entered, sent to the first page'
  )
  return pagePath(request.params.journeyId, originPage.slug)
}
