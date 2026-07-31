import { replaceJourneyFulfilment } from '../../journey.js'
import { purgeFulfilments } from '../../../bridge/purge.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { memoRequestView } from '../../read.js'
import { assertRecognisedAnswerKeys } from '../../../bridge/obligation-source.js'
import { splitPatch } from './split.js'
import { viewWithFlowOnlyAnswers } from './view.js'
import { hasKeys } from './predicates.js'

export const replaceFromNameKeyedMutation = async (
  request,
  journey,
  answers,
  context,
  flowOnlyAnswers,
  { assertKeys = true } = {}
) => {
  const { canonical } = splitPatch(answers)
  if (assertKeys) assertRecognisedAnswerKeys(canonical, context)

  const evaluation = purgeFulfilments(assembleFulfilments(canonical))
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

export const currentViewAfterCanonicalPatch = async (
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
