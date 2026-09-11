import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { addressesPage } from '../../../../addresses/page.js'
import { cphApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

/** `parties` carries party answers with address-book references resolved to
 * current details, or the submit freeze when the controller passes
 * {@link partiesFromStoredAnswers} output. `partyErrors` is computed once by the
 * controller and threaded down, so the rows and the error summary always agree
 * on which roles are outstanding.
 *
 * The CPH number is collected on its own page, so this card's rows span two.
 * The one Change link goes to the addresses page — the page the hub's addresses
 * task row leads with, and the page the five roles come from. */
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
    partyRow(copy.rows.placeOfOrigin, parties.placeOfOrigin, {
      errorText: partyErrors.placeOfOrigin
    }),
    partyRow(copy.rows.consignor, parties.consignor, {
      errorText: partyErrors.consignor
    }),
    partyRow(copy.rows.consignee, parties.consignee, {
      errorText: partyErrors.consignee
    }),
    partyRow(copy.rows.importer, parties.importer, {
      errorText: partyErrors.importer
    }),
    partyRow(copy.rows.placeOfDestination, parties.placeOfDestination, {
      errorText: partyErrors.placeOfDestination
    }),
    ...(cphApplies(answers)
      ? [row(copy.rows.cph, answers.countyParishHoldingCph)]
      : [])
  ]
})
