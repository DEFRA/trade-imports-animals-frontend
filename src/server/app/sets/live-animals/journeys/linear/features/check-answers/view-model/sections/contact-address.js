import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { contactAddressCard } from '../cards/addresses/contact-address.js'

const copy = copyFor({ en, cy })

export const contactAddressSection = ({
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
}) => ({
  anchor: 'contact-address-section',
  heading: copy.sections.contactAddress,
  groups: [
    {
      heading: copy.groups.contactAddress,
      cards: [
        contactAddressCard({
          journeyId,
          answers,
          readOnly,
          parties,
          partyErrors
        })
      ]
    }
  ]
})
