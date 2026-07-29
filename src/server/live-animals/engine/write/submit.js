import { get } from '../read.js'
import { assertRecognisedAnswerKeys } from '../../bridge/obligation-source.js'
import { session } from '../persistence/session.js'
import { records } from '../persistence/records.js'

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
  const owner = await session.owner(request)
  const submitted = await records.finalise(current.journey.journeyId, owner)
  return { ok: true, journey: submitted, scope: current.scope }
}
