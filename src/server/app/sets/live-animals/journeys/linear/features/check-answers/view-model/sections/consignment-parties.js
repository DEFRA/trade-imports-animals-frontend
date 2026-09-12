import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { rolesAndAddressesCard } from '../cards/addresses/roles-and-addresses.js'

const copy = copyFor({ en, cy })

// Design release 1's fifth numbered section: the businesses and places the
// consignment passes between. The address to contact about the consignment is
// not one of them, so it has a numbered section of its own after this one.
export const consignmentPartiesSection = (
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
) => ({
  anchor: 'consignment-parties',
  heading: copy.sections.consignmentParties,
  groups: [
    {
      heading: copy.groups.rolesAndAddresses,
      cards: [
        rolesAndAddressesCard(
          journeyId,
          answers,
          readOnly,
          parties,
          partyErrors
        )
      ]
    }
  ]
})
