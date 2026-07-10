import { currentJourney, saveJourneyAnswers } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { makeScope } from './read.js'
import { records } from './persistence/records.js'
import { setAt, valueAt, destroyWiped } from '../lib/path.js'

const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

export const appendEntryAt = async (request, h, collectionPath, entry) => {
  const journey = await currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const answers = setAt(journey.answers, collectionPath, [...list, entry])
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return list.length
}

export const updateEntryAt = async (
  request,
  h,
  collectionPath,
  index,
  entry
) => {
  const journey = await currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.with(index, entry)
  )
  await saveJourneyAnswers(request, journey.journeyId, answers)
}

export const removeEntryAt = async (request, h, collectionPath, index) => {
  const journey = await currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.toSpliced(index, 1)
  )
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  await saveJourneyAnswers(request, journey.journeyId, answers)
}

export const appendEntry = async (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = async (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = async (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

export const submitJourney = async (request, h) => {
  const journey = await currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForCheckYourAnswers) return { ok: false, journey, scope }
  const submitted = await records.finalise(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}
