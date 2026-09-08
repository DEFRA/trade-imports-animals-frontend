import { copyFor } from '../../../../../../../shared/copy.js'
import { PARTIES } from '../../addresses/parties.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/** A role is outstanding only when an answer that WAS given no longer resolves
 * — the address it referenced has since been deleted. A role never answered is
 * simply unanswered: it renders as "not provided" and raises no error, because
 * an error before the user has had a chance to answer is not an error. */
const outstandingParties = (answers = {}, parties = answers) =>
  PARTIES.filter((party) => answers[party.id]?.addressId && !parties[party.id])

export const outstandingPartyErrors = (answers, parties) =>
  Object.fromEntries(
    outstandingParties(answers, parties).map((party) => [
      party.id,
      copy.errors.parties[party.id]
    ])
  )
