import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { consignmentAddressesCard } from '../cards/addresses/consignment-addresses.js'

const copy = copyFor({ en, cy })

export const addressesSection = ({
  journeyId,
  changeLinkTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {},
  permanentAddresses = []
}) => ({
  anchor: 'consignment-addresses',
  heading: copy.sections.addresses,
  cards: [
    consignmentAddressesCard({
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
