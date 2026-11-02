import { get } from '../read.js'
import { assertRecognisedAnswerKeys } from '../../bridge/obligation-source.js'
import { records } from '../persistence/records.js'
import { buildActor } from '../../../common/helpers/actor-helpers.js'

export const submitJourney = async (request, h, { concurrencyToken }) => {
  if (concurrencyToken === undefined) {
    throw new Error('submitJourney requires the reviewed concurrencyToken')
  }
  const current = await get(request, h)
  assertRecognisedAnswerKeys(current.answers, 'submitJourney')
  if (!current.scope.readyForCheckYourAnswers) {
    return {
      ok: false,
      journey: current.journey,
      scope: current.scope
    }
  }
  const actor = buildActor(request.auth.credentials)
  const submitted = await records.finalise(
    current.journey.journeyId,
    actor,
    concurrencyToken
  )
  return { ok: true, journey: submitted, scope: current.scope }
}
