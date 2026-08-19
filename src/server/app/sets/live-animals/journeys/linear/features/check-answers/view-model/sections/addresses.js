import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { contactAddressCard } from '../cards/addresses/contact-address.js'
import { rolesAndAddressesCard } from '../cards/addresses/roles-and-addresses.js'

const copy = copyFor({ en, cy })

export const addressesSection = (
  journeyId,
  answers,
  readOnly,
  parties = answers
) => {
  return {
    heading: copy.sections.addresses,
    groups: [
      {
        heading: null,
        cards: [
          rolesAndAddressesCard(journeyId, answers, readOnly, parties),
          contactAddressCard(journeyId, answers, readOnly, parties)
        ]
      }
    ]
  }
}
