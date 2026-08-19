import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { partyRow } from '../../rows/party-row.js'

const copy = copyFor({ en, cy })

export const contactAddressCard = (
  journeyId,
  answers,
  readOnly,
  parties = answers
) => ({
  title: copy.cards.contactAddress,
  rows: [
    partyRow(
      journeyId,
      readOnly,
      copy.rows.address,
      parties.contactAddress,
      'contactAddress',
      copy.hidden.contactAddress
    )
  ]
})
