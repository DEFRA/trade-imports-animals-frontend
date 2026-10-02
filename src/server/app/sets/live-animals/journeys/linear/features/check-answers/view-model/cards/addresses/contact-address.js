import { copyFor } from '../../../../../../../../../shared/copy.js'
import { CYA_SLUG } from '../../../../../../../../../shared/kit.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { consignmentContactSelectPage } from '../../../../contact/page.js'
import { CONTACT_PARTY } from '../../../../addresses/parties.js'
import { partyEditHref } from '../../../../addresses/party-edit/edit-href.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'

const copy = copyFor({ en, cy })

export const contactAddressCard = (
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
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
  rows: [
    partyRow(copy.rows.contactAddress, parties.contactAddress, {
      errorText: partyErrors.contactAddress,
      editHref: readOnly
        ? undefined
        : partyEditHref(journeyId, CONTACT_PARTY, CYA_SLUG)
    })
  ]
})
