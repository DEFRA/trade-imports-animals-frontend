import { resolveParties } from './resolve-parties.js'
import { answerForInlineParty } from './party-inline.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]

/** Freeze at submit — persist a fresh resolve so the submit moment matches the address book. */
export const reinflatePartyAnswers = async (request, answers) => {
  const resolved = await resolveParties(request, answers)
  const next = { ...answers }
  for (const party of ALL_PARTIES) {
    const record = resolved[party.id]
    if (record) {
      next[party.id] = answerForInlineParty(record)
    }
  }
  return next
}
