import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { addressesCard } from '../cards/addresses/addresses.js'

const copy = copyFor({ en, cy })

export const consignmentAddressesSection = ({
  journeyId,
  changeLinkTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {},
  permanentAddresses = []
}) => ({
  anchor: 'consignment-addresses',
  heading: copy.sections.consignmentAddresses,
  cards: [
    addressesCard({
      journeyId,
      changeLinkTrail,
      answers,
      readOnly,
      parties,
      partyErrors,
      permanentAddresses
    })
  ]
})
