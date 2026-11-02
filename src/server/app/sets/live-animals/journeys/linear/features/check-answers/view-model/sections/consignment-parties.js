import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { rolesAndAddressesCard } from '../cards/addresses/roles-and-addresses.js'

const copy = copyFor({ en, cy })

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
