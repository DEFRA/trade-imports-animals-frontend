import { currentJourney, saveJourneyAnswers } from './journey.js'
import { collectionCapAt } from './evaluate/cardinality.js'
import { makeScope } from './read.js'
import { wipeSet } from '../bridge/purge.js'
import { records } from './persistence/records.js'
import { setAt, valueAt, destroyWiped } from '../lib/path.js'
import { assertRecognisedAnswerKeys } from '../flow/obligation-source.js'

const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

const purge = (answers) => {
  destroyWiped(answers, wipeSet(answers))
}

// An unrecognised answer key is inert to the evaluator yet ships raw at
// finalise, so every key-introducing write asserts the whole resulting
// tree before saving. removeEntryAt deliberately does not — a removal
// cannot introduce a key, and it must stay usable for clearing out a
// record that already carries one.

export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  purge(answers)
  assertRecognisedAnswerKeys(answers, 'commit')
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

// Entry-level writes save without purging — commit/removeEntryAt/
// reconcileEntriesAt are the purge authorities. Safe only while no
// entry-write caller mutates a gate input (a gate flip must ride a
// purging write); see entry-write-purge-window.test.js.
export const appendEntryAt = async (request, h, collectionPath, entry) => {
  const journey = await currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const cap = collectionCapAt(journey.answers, collectionPath)
  if (cap !== null && list.length >= cap) return null
  const answers = setAt(journey.answers, collectionPath, [...list, entry])
  assertRecognisedAnswerKeys(answers, 'appendEntryAt')
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
  assertRecognisedAnswerKeys(answers, 'updateEntryAt')
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
  purge(answers)
  await saveJourneyAnswers(request, journey.journeyId, answers)
}

export const reconcileEntriesAt = async (
  request,
  h,
  collectionPath,
  keyOf,
  entries
) => {
  const journey = await currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const existingByKey = new Map(list.map((entry) => [keyOf(entry), entry]))
  const next = entries.map((entry) => existingByKey.get(keyOf(entry)) ?? entry)
  const answers = setAt(journey.answers, collectionPath, next)
  purge(answers)
  assertRecognisedAnswerKeys(answers, 'reconcileEntriesAt')
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

export const appendEntry = async (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = async (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = async (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

export const submitJourney = async (request, h) => {
  const journey = await currentJourney(request, h)
  // Last line of defence for stored trees the write guards never saw
  // (records written before the guard existed, or resumed from outside):
  // finalise ships the RAW stored answers, so nothing unrecognised may
  // pass. Asserted before the readiness gate — a corrupt tree should
  // fail loudly, not read as merely not-ready.
  assertRecognisedAnswerKeys(journey.answers, 'submitJourney')
  const scope = makeScope(journey.answers)
  if (!scope.readyForCheckYourAnswers) return { ok: false, journey, scope }
  const submitted = await records.finalise(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}
