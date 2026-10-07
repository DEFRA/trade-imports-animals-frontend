import { copyFor } from '../../../../../../../shared/copy.js'
import { addressBookCountries } from '../../../../../../../services/countries/index.js'
import { CONTACT_PARTY, PARTIES } from '../../addresses/parties.js'
import { isValidParty } from '../../addresses/party-edit/address-rules.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]

/** An unanswered role is not an error: the user has not had a chance to answer. */
export const invalidPartyErrors = async (answers = {}) => {
  const answered = ALL_PARTIES.filter((party) => answers[party.id])
  if (answered.length === 0) {
    return {}
  }
  const countryCodes = (await addressBookCountries()).map(({ code }) => code)
  return Object.fromEntries(
    answered
      .filter((party) => !isValidParty(answers[party.id], countryCodes))
      .map((party) => [party.id, copy.errors.parties[party.id]])
  )
}
