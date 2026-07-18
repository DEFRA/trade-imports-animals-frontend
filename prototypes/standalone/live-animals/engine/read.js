import { currentJourney } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { walk } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { valueAt } from '../lib/path.js'
import { makeScopeFromB } from '../model/bridge/scope.js'
import {
  configureReadyForCheckYourAnswers,
  computeReadyForCheckYourAnswers
} from './readiness-config.js'

export { configureReadyForCheckYourAnswers }

const anyInstanceAnswered = (answers, id) => {
  for (const node of walk(answers)) {
    if (node.obligation.id === id && isAnswered(valueAt(answers, node.path))) {
      return true
    }
  }
  return false
}

export const makeScopeA = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: computeReadyForCheckYourAnswers(answers, inScope)
  }
}

export const makeScope = (answers) => makeScopeFromB(answers)

const readViewOf = (journey) => ({
  journey,
  answers: journey.answers,
  scope: makeScope(journey.answers)
})

export const get = async (request, h) =>
  readViewOf(await currentJourney(request, h))
