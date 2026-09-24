import { copyFor } from '../../../../../../shared/copy.js'
import { PARTIES } from './parties.js'
import { copy as en } from '../check-answers/copy/copy.en.js'
import { copy as cy } from '../check-answers/copy/copy.cy.js'

// Party-role copy already lives on the CYA copy module (used today by
// outstandingPartyErrors), so the hook reads from the same source and the
// per-role summary messages stay identical to the pre-hook UX.
const copy = copyFor({ en, cy })

export const validateStoredAnswers = async (answers, ctx) => {
  const errors = {}
  for (const party of PARTIES) {
    const id = answers[party.id]?.addressId
    if (id && !ctx.addressStatuses.get(id)) {
      errors[party.id] = copy.errors.parties[party.id]
    }
  }
  return errors
}
