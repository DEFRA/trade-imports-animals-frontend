import { replaceJourneyFulfilment } from './journey.js'
import { collectionCapAt } from './evaluate/cardinality.js'
import { get, memoRequestView } from './read.js'
import { assembleRequestView } from './request-view.js'
import { purgeFulfilments } from '../bridge/purge.js'
import { migrateNameKeyedAnswersToFulfilments } from '../bridge/name-keyed-migration.js'
import { records } from './persistence/records.js'
import { session } from './persistence/session.js'
import { setAt, valueAt } from '../lib/path.js'
import {
  assertRecognisedAnswerKeys,
  FLOW_ONLY_OBLIGATIONS,
  flowOnlyAnswersFrom
} from '../flow/obligation-source.js'

const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const splitPatch = (patch) => {
  const canonical = { ...patch }
  const flowOnly = {}
  for (const key of FLOW_ONLY_OBLIGATIONS) {
    if (!hasOwn(canonical, key)) continue
    flowOnly[key] = canonical[key]
    delete canonical[key]
  }
  return { canonical, flowOnly }
}

const hasKeys = (value) => Object.keys(value).length > 0

const viewWithFlowOnlyAnswers = (
  view,
  flowOnlyAnswers,
  evaluation = view.evaluation
) => {
  const assembled = assembleRequestView(
    view.fulfilment,
    evaluation,
    flowOnlyAnswers
  )
  return { ...view, ...assembled, flowOnlyAnswers }
}

// MIGRATION FACADE: increment 4 controllers still mutate their name-keyed
// request projection. Rebuild the canonical map here, evaluate/purge it, and
// persist only state.fulfilments. Feature-owned UUID writes replace this seam
// in increment 5.
const replaceFromNameKeyedMutation = async (
  request,
  journey,
  answers,
  context,
  flowOnlyAnswers,
  { assertKeys = true } = {}
) => {
  const { canonical } = splitPatch(answers)
  if (assertKeys) assertRecognisedAnswerKeys(canonical, context)

  const evaluation = purgeFulfilments(
    migrateNameKeyedAnswersToFulfilments(canonical)
  )
  const savedJourney = await replaceJourneyFulfilment(
    request,
    journey.journeyId,
    evaluation.fulfilments
  )
  const view = viewWithFlowOnlyAnswers(
    {
      journey: savedJourney,
      fulfilment: savedJourney.fulfilment,
      evaluation
    },
    flowOnlyAnswers,
    evaluation
  )
  memoRequestView(request, view)
  return view
}

const persistFlowOnlyPatch = async (request, h, view, patch) => {
  if (!hasKeys(patch)) return view
  const flowOnlyAnswers = await session.setFlowOnlyAnswers(
    h,
    view.journey.journeyId,
    flowOnlyAnswersFrom({ ...view.flowOnlyAnswers, ...patch }),
    request
  )
  const next = viewWithFlowOnlyAnswers(view, flowOnlyAnswers)
  memoRequestView(request, next)
  return next
}

const currentViewAfterCanonicalPatch = async (
  request,
  current,
  canonical,
  context
) => {
  if (!hasKeys(canonical)) return current
  return replaceFromNameKeyedMutation(
    request,
    current.journey,
    { ...current.answers, ...canonical },
    context,
    current.flowOnlyAnswers
  )
}

export const commit = async (request, h, patch) => {
  const current = await get(request, h)
  const { canonical, flowOnly } = splitPatch(patch)
  const canonicalView = await currentViewAfterCanonicalPatch(
    request,
    current,
    canonical,
    'commit'
  )
  const view = await persistFlowOnlyPatch(request, h, canonicalView, flowOnly)
  return { answers: view.answers, scope: view.scope }
}

export const appendEntryAt = async (request, h, collectionPath, entry) => {
  const current = await get(request, h)
  const list = valueAt(current.answers, collectionPath) ?? []
  const cap = collectionCapAt(current.answers, collectionPath)
  if (cap !== null && list.length >= cap) return null
  const answers = setAt(current.answers, collectionPath, [...list, entry])
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'appendEntryAt',
    current.flowOnlyAnswers
  )
  return list.length
}

export const updateEntryAt = async (
  request,
  h,
  collectionPath,
  index,
  entry
) => {
  const current = await get(request, h)
  const list = valueAt(current.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    current.answers,
    collectionPath,
    list.with(index, entry)
  )
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'updateEntryAt',
    current.flowOnlyAnswers
  )
}

export const removeEntryAt = async (request, h, collectionPath, index) => {
  const current = await get(request, h)
  const list = valueAt(current.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    current.answers,
    collectionPath,
    list.toSpliced(index, 1)
  )
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'removeEntryAt',
    current.flowOnlyAnswers,
    { assertKeys: false }
  )
}

export const reconcileEntriesAt = async (
  request,
  h,
  collectionPath,
  keyOf,
  entries
) => {
  const current = await get(request, h)
  const list = valueAt(current.answers, collectionPath) ?? []
  const existingByKey = new Map(list.map((entry) => [keyOf(entry), entry]))
  const next = entries.map((entry) => existingByKey.get(keyOf(entry)) ?? entry)
  const answers = setAt(current.answers, collectionPath, next)
  const view = await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'reconcileEntriesAt',
    current.flowOnlyAnswers
  )
  return { answers: view.answers, scope: view.scope }
}

export const appendEntry = async (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = async (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = async (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

export const submitJourney = async (request, h) => {
  const current = await get(request, h)
  assertRecognisedAnswerKeys(current.answers, 'submitJourney')
  if (!current.scope.readyForCheckYourAnswers) {
    return {
      ok: false,
      journey: current.journey,
      scope: current.scope
    }
  }
  const submitted = await records.finalise(current.journey.journeyId)
  return { ok: true, journey: submitted, scope: current.scope }
}
