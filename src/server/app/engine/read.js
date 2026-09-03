import { currentJourney } from './journey.js'
import { evaluateAnswers } from '../bridge/evaluation.js'
import { makeScopeFromEvaluation } from '../bridge/scope.js'
import { assembleRequestView } from './request-view.js'
import { session } from './persistence/session.js'
import { flowOnlyAnswersFrom } from '../bridge/obligation-source.js'
import { answersForRead } from '../bridge/answers-read.js'

export { configureReadyForCheckYourAnswers } from '../bridge/readiness-config.js'
export { configureAnswersForRead } from '../bridge/answers-read.js'

export const makeScope = (answers) =>
  makeScopeFromEvaluation(evaluateAnswers(answers), answers)

const REQUEST_VIEW_MEMO = Symbol('requestView')

const memoRead = (request) => request?.app?.[REQUEST_VIEW_MEMO]

export const memoRequestView = (request, view) => {
  if (request?.app) {
    request.app[REQUEST_VIEW_MEMO] = view
  }
}

const readViewOf = async (request, journey) => {
  const flowOnlyAnswers = flowOnlyAnswersFrom(
    await session.flowOnlyAnswers(request, journey.journeyId)
  )
  const assembled = assembleRequestView(
    journey.fulfilment,
    undefined,
    flowOnlyAnswers
  )
  const { answers: storedAnswers } = assembled
  const answers = await answersForRead(request, storedAnswers)
  if (answers === storedAnswers) {
    return {
      journey,
      fulfilment: journey.fulfilment,
      evaluation: assembled.evaluation,
      answers: storedAnswers,
      storedAnswers,
      scope: assembled.scope,
      flowOnlyAnswers
    }
  }

  // Re-evaluate when a set sanitiser changed answers (e.g. a deleted
  // address-book reference treated as never entered).
  //
  // `storedAnswers` keeps what was actually saved, which is the only place a
  // reference the sanitiser dropped still exists. Render from `answers`: a
  // dangling reference resolves to nothing, so anything drawn from
  // `storedAnswers` risks showing an address that has been deleted. It is here
  // so a page can tell "answered, then deleted" from "never answered" — the
  // two are identical once the sanitiser has run.
  const evaluation = evaluateAnswers(answers)
  return {
    journey,
    fulfilment: journey.fulfilment,
    evaluation,
    answers,
    storedAnswers,
    scope: makeScopeFromEvaluation(evaluation, answers),
    flowOnlyAnswers
  }
}

export const get = async (request, h) => {
  const cached = memoRead(request)
  if (cached) {
    return cached
  }
  const view = await readViewOf(request, await currentJourney(request, h))
  memoRequestView(request, view)
  return view
}
