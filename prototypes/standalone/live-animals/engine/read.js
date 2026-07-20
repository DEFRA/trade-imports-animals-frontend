import { currentJourney } from './journey.js'
import { makeScopeFromB } from '../model/bridge/scope.js'
import { configureReadyForCheckYourAnswers } from './readiness-config.js'

export { configureReadyForCheckYourAnswers }

export const makeScope = (answers) => makeScopeFromB(answers)

const readViewOf = (journey) => ({
  journey,
  answers: journey.answers,
  scope: makeScope(journey.answers)
})

export const get = async (request, h) =>
  readViewOf(await currentJourney(request, h))
