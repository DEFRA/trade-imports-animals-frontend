import { copyFor } from '../../../../../../../shared/copy.js'
import { addressCountryOptions } from '../../../../../../../services/countries/index.js'
import { CONTACT_PARTY, PARTIES } from '../../addresses/parties.js'
import { isValidParty } from '../../addresses/party-edit/address-rules.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]

/** A copied address that no longer meets the address-book rules, keyed by party
 * id. A role never answered is simply unanswered: it renders as "not provided"
 * and raises no error here, because an error before the user has had a chance
 * to answer is not an error. */
export const invalidPartyErrors = async (answers = {}) => {
  const answered = ALL_PARTIES.filter((party) => answers[party.id])
  if (answered.length === 0) {
    return {}
  }
  const countryCodes = (await addressCountryOptions()).map(({ code }) => code)
  return Object.fromEntries(
    answered
      .filter((party) => !isValidParty(answers[party.id], countryCodes))
      .map((party) => [party.id, copy.errors.parties[party.id]])
  )
}
