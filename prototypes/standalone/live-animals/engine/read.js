import { currentJourney } from './journey.js'
import { makeScope } from '../bridge/scope.js'
import { configureReadyForCheckYourAnswers } from './readiness-config.js'

export { configureReadyForCheckYourAnswers }
export { makeScope }

const readViewOf = (journey) => {
  const { answers } = journey
  return { journey, answers, scope: makeScope(answers) }
}

export const get = async (request, h) =>
  readViewOf(await currentJourney(request, h))
