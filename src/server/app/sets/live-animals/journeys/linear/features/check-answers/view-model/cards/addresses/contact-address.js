import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { consignmentContactSelectPage } from '../../../../contact/page.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'

const copy = copyFor({ en, cy })

export const contactAddressCard = ({
  journeyId,
  changeLinkTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
}) => ({
  id: 'contactAddress',
  title: copy.cards.contactAddress,
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      consignmentContactSelectPage.slug,
      copy.hidden.cards.contactAddress
    )
  }),
  rows: [
    partyRow(copy.rows.contactAddress, parties.contactAddress, {
      errorText: partyErrors.contactAddress
    })
  ]
})
