import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { consignmentContactSelectPage } from '../../../../contact/page.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'

const copy = copyFor({ en, cy })

export const contactAddressCard = (
  journeyId,
  answers,
  readOnly,
  parties = answers
) => ({
  id: 'contactAddress',
  title: copy.cards.contactAddress,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      consignmentContactSelectPage.slug,
      copy.hidden.cards.contactAddress
    )
  ),
  rows: [partyRow(copy.rows.address, parties.contactAddress)]
})
