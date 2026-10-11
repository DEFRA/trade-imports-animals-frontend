import { createPath, pagePath, setBase } from '../../../../../shared/paths.js'
import { isAnswered } from '../../../../../lib/answered.js'
import { get } from '../../../../../engine/read.js'
import { isJourneyNotFound } from '../../../../../engine/journey.js'
import {
  obligationByName,
  SYSTEM_POPULATED
} from '../../../../../bridge/obligation-source.js'
import { originPage } from '../features/origin/page.js'
import { openingRunStarted } from '../../../../../flow/run-state.js'

// A function, not a module-load constant: `request.path` now carries the Hapi
// mount prefix, which is only known inside a request's set context.
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

const viewOrNone = async (request, h) => {
  try {
    return await get(request, h)
  } catch (error) {
    if (isJourneyNotFound(error)) {
      return null
    }
    throw error
  }
}

/** Deep-link guard: a journey with neither a run record in this session nor
 * committed user answers is sent to the entry page (see
 * sets/live-animals/docs/journey-flow-and-gates.md, "Opening run and entry guard").
 * A notification that cannot be found is left to the page it asked for. */
export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) {
    return null
  }
  const view = await viewOrNone(request, h)
  if (view === null) {
    return null
  }
  const { journey, answers } = view
  if (await openingRunStarted(request, journey.journeyId)) {
    return null
  }
  if (hasCommittedNotificationAnswers(answers)) {
    return null
  }
  return pagePath(request.params.journeyId, originPage.slug)
}
