import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { contactAddressCard } from '../cards/addresses/contact-address.js'

const copy = copyFor({ en, cy })

export const contactAddressSection = (
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
) => ({
  // Suffixed, like the documents section and for the same reason: the contact
  // address CARD already owns the `contact-address` id, which is what the error
  // summary's "Complete contact address for this consignment" link anchors to.
  anchor: 'contact-address-section',
  heading: copy.sections.contactAddress,
  groups: [
    {
      heading: copy.groups.contactAddress,
      cards: [
        contactAddressCard(journeyId, answers, readOnly, parties, partyErrors)
      ]
    }
  ]
})
