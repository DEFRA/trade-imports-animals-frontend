import { copyFor } from '../../../../../../../shared/copy.js'
import { PARTIES } from '../../addresses/parties.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/** Inline parties hold their own details, so no address-book deletion can empty
 * one — only a referenced role can end up with nothing to show. */
export const outstandingParties = (parties = {}) =>
  PARTIES.filter((party) => !party.inline && !parties[party.id])

export const outstandingPartyErrors = (parties) =>
  Object.fromEntries(
    outstandingParties(parties).map((party) => [
      party.id,
      copy.errors.parties[party.id]
    ])
  )
