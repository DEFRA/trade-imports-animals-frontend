import { records } from './persistence/records.js'

export { IN_PROGRESS, SUBMITTED } from './persistence/records.js'

export const store = {
  create: (createOptions) => records.create(createOptions),
  get: (journeyId) => records.load({ journeyId }),
  has: records.has,
  saveAnswers: records.saveAnswers,
  submit: records.finalise,
  clear: records.clear
}
