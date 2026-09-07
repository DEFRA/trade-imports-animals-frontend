import { SUBMITTED } from '../../../../../../engine/persistence/records.js'
import { resolveParties } from './resolve-parties.js'
import { partiesFromStoredAnswers } from './frozen-parties.js'

/** Parties for display: SUBMITTED reads stored inline details from answers; DRAFT and
 * AMEND live-resolve from the address book and ignore any stored inline copy. */
export const partiesForRender = async (request, journey, answers = {}) =>
  journey.status === SUBMITTED
    ? partiesFromStoredAnswers(answers)
    : await resolveParties(request, answers)
