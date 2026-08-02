// Scaffolded by docs/add-a-set.md step 9.
import {
  obligationByName,
  systemPopulated
} from '../../../../../bridge/obligation-source.js'
import { get } from '../../../../../engine/read.js'
import { hasEnteredThroughFilter } from '../../../../../flow/run-state.js'
import { isAnswered } from '../../../../../lib/answered.js'
import { createPath, pagePath, setBase } from '../../../../../shared/paths.js'
import { importTypePage } from '../features/import-type/page.js'

const IMPORT_TYPE_KEY = 'importType'
const ACTION_SLUGS = new Set(['amend', 'cancel-amend', 'copy', 'delete'])
const journeyPrefix = () => `${setBase()}/notifications/`

export const parseJourneyPath = (path) => {
  if (!path.startsWith(journeyPrefix()) || path === createPath()) return null
  const [journeyId, ...slugParts] = path
    .slice(journeyPrefix().length)
    .split('/')
  return { journeyId, slug: slugParts.join('/') }
}

export const guardedJourneyPath = (path) => {
  const parsed = parseJourneyPath(path)
  if (!parsed) return false
  const { journeyId, slug } = parsed
  if (ACTION_SLUGS.has(slug)) return false
  const isEntrySurface =
    slug === importTypePage.slug || slug.startsWith(`${importTypePage.slug}/`)
  return Boolean(journeyId) && !isEntrySurface
}

const userEntered = (key) => {
  if (key === IMPORT_TYPE_KEY) return false
  const obligation = obligationByName(key)
  return obligation !== undefined && !systemPopulated().has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) return null
  const { journey, answers } = await get(request, h)
  if (await hasEnteredThroughFilter(request, journey.journeyId)) return null
  if (hasCommittedNotificationAnswers(answers)) return null
  return pagePath(request.params.journeyId, importTypePage.slug)
}
