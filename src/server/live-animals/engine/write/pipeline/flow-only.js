import { session } from '../../persistence/session.js'
import { flowOnlyAnswersFrom } from '../../../bridge/obligation-source.js'
import { memoRequestView } from '../../read.js'
import { viewWithFlowOnlyAnswers } from './view.js'
import { hasKeys } from './predicates.js'

export const persistFlowOnlyPatch = async (request, h, view, patch) => {
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
