import { records } from './persistence/records.js'
import { projectAnswers } from '../bridge/fulfilments.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'

export { IN_PROGRESS, SUBMITTED } from './persistence/records.js'

const withAnswersProjection = async (journeyPromise) => {
  const journey = await journeyPromise
  return journey
    ? { ...journey, answers: projectAnswers(journey.fulfilment) }
    : undefined
}

export const store = Object.freeze({
  create: (createOptions) =>
    withAnswersProjection(records.create(createOptions)),
  get: (journeyId) => withAnswersProjection(records.load({ journeyId })),
  has: records.has,
  seedAnswers: (journeyId, answers) =>
    withAnswersProjection(
      records.replaceFulfilment(journeyId, assembleFulfilments(answers))
    ),
  replaceFulfilment: (journeyId, fulfilment) =>
    withAnswersProjection(records.replaceFulfilment(journeyId, fulfilment)),
  submit: (journeyId) => withAnswersProjection(records.finalise(journeyId)),
  clear: records.clear
})
