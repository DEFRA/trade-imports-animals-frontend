import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { rolesAndAddressesCard } from '../cards/addresses/roles-and-addresses.js'

const copy = copyFor({ en, cy })

export const consignmentPartiesSection = ({
  journeyId,
  changeLinkTrail,
  reviewPageTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {},
  permanentAddresses = []
}) => ({
  anchor: 'consignment-parties',
  heading: copy.sections.consignmentParties,
  groups: [
    {
      heading: copy.groups.rolesAndAddresses,
      cards: [
        rolesAndAddressesCard({
          journeyId,
          changeLinkTrail,
          reviewPageTrail,
          answers,
          readOnly,
          parties,
          partyErrors,
          permanentAddresses
        })
      ]
    }
  ]
})
