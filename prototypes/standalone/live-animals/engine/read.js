import { currentJourney, resumeByUser } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { walk } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { valueAt } from '../lib/path.js'

/**
 * Handed in at boot via `configureReadyForCheckYourAnswers`; the default
 * THROWS: an unconfigured `makeScope` is a hard, loud failure, never a silent
 * wrong answer.
 */
let readyForCheckYourAnswersFn = () => {
  throw new Error(
    'readyForCheckYourAnswers not configured — call ' +
      'configureReadyForCheckYourAnswers() at boot'
  )
}

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

/**
 * Instance-aware answered check: true if ANY instance of `id` at any depth is
 * answered. Walking (rather than a top-level `answers[id]` lookup) is what lets
 * a flow prerequisite key on an item-level obligation like
 * `commodityLines[i].commoditySelection` — answered once ANY commodity line
 * fills it. A top-level obligation collapses to a single walk node, so this
 * matches `isAnswered(answers[id])` for those.
 */
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

/**
 * `scope` is always rebuilt fresh by `reconcile` from the journey's answers —
 * nothing derived is ever read back from the record.
 */
const readViewOf = (journey) => ({
  journey,
  answers: journey.answers,
  scope: makeScope(journey.answers)
})

export const get = (request, h) => readViewOf(currentJourney(request, h))

export const resume = (request, h) => readViewOf(resumeByUser(request, h))
