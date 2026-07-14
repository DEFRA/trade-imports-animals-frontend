import { currentJourney } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { walk } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { valueAt } from '../lib/path.js'

let readyForCheckYourAnswersFn = () => {
  throw new Error(
    'readyForCheckYourAnswers not configured — call ' +
      'configureReadyForCheckYourAnswers() at boot'
  )
}

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

const anyInstanceAnswered = (answers, id) => {
  for (const node of walk(answers)) {
    if (node.obligation.id === id && isAnswered(valueAt(answers, node.path))) {
      return true
    }
  }
  return false
}

export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: readyForCheckYourAnswersFn(answers, inScope)
  }
}

const readViewOf = (journey) => ({
  journey,
  answers: journey.answers,
  scope: makeScope(journey.answers)
})

export const get = async (request, h) =>
  readViewOf(await currentJourney(request, h))
