import { copyFor } from '../../../../../../../../../shared/copy.js'
import { CYA_SLUG } from '../../../../../../../../../shared/kit.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { addressesPage } from '../../../../addresses/page.js'
import { partyOf } from '../../../../addresses/parties.js'
import { partyEditHref } from '../../../../addresses/party-edit/edit-href.js'
import { cphApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

const ROLE_IDS = [
  'placeOfOrigin',
  'consignor',
  'consignee',
  'importer',
  'placeOfDestination'
]

/** `parties` carries the stored party copies in display shape
 * ({@link partiesFromStoredAnswers}). `partyErrors` is computed once by the
 * controller and threaded down, so the rows and the error summary always agree
 * on which roles are in error.
 *
 * The CPH number is collected on its own page, so this card's rows span two.
 * The one Change link goes to the addresses page — the page the hub's addresses
 * task row leads with, and the page the five roles come from. Each copied
 * address also links to edit its details, returning here. */
export const rolesAndAddressesCard = (
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
) => ({
  id: 'rolesAndAddresses',
  title: copy.cards.rolesAndAddresses,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      addressesPage.slug,
      copy.hidden.cards.rolesAndAddresses
    )
  ),
  rows: [
    ...ROLE_IDS.map((id) =>
      partyRow(copy.rows[id], parties[id], {
        errorText: partyErrors[id],
        editHref: readOnly
          ? undefined
          : partyEditHref(journeyId, partyOf(id), CYA_SLUG)
      })
    ),
    ...(cphApplies(answers)
      ? [row(copy.rows.cph, answers.countyParishHoldingCph)]
      : [])
  ]
})
