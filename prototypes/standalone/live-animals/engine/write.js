import { currentJourney } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { makeScope } from './read.js'
import { records } from './persistence/records.js'
import { setAt, valueAt, destroyWiped } from '../lib/path.js'

const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

export const commit = (request, h, patch) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

export const appendEntryAt = (request, h, collectionPath, entry) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const answers = setAt(journey.answers, collectionPath, [...list, entry])
  records.saveAnswers(journey.journeyId, answers)
  return list.length
}

export const updateEntryAt = (request, h, collectionPath, index, entry) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.with(index, entry)
  )
  records.saveAnswers(journey.journeyId, answers)
}

export const removeEntryAt = (request, h, collectionPath, index) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.toSpliced(index, 1)
  )
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
}

export const appendEntry = (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

export const submitJourney = (request, h) => {
  const journey = currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForCheckYourAnswers) return { ok: false, journey, scope }
  const submitted = records.finalise(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}
