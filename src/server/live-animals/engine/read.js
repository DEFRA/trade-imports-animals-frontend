import { currentJourney } from './journey.js'
import { evaluateAnswers } from '../bridge/evaluation.js'
import { makeScopeFromEvaluation } from '../bridge/scope.js'
import { configureReadyForCheckYourAnswers } from './readiness-config.js'
import { assembleRequestView } from './request-view.js'
import { session } from './persistence/session.js'
import { flowOnlyAnswersFrom } from '../flow/obligation-source.js'

export { configureReadyForCheckYourAnswers }

export const makeScope = (answers) =>
  makeScopeFromEvaluation(evaluateAnswers(answers), answers)

const REQUEST_VIEW_MEMO = Symbol('liveAnimalsRequestView')

const memoRead = (request) => request?.app?.[REQUEST_VIEW_MEMO]

export const memoRequestView = (request, view) => {
  if (request?.app) request.app[REQUEST_VIEW_MEMO] = view
}

const readViewOf = async (request, journey) => {
  const flowOnlyAnswers = flowOnlyAnswersFrom(
    await session.flowOnlyAnswers(request, journey.journeyId)
  )
  const { evaluation, answers, scope } = assembleRequestView(
    journey.fulfilment,
    undefined,
    flowOnlyAnswers
  )
  return {
    journey,
    fulfilment: journey.fulfilment,
    evaluation,
    answers,
    scope,
    flowOnlyAnswers
  }
}

export const get = async (request, h) => {
  const cached = memoRead(request)
  if (cached) return cached
  const view = await readViewOf(request, await currentJourney(request, h))
  memoRequestView(request, view)
  return view
}
