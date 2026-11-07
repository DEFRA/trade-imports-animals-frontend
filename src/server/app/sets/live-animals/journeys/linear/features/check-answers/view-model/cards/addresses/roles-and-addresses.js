import { copyFor } from '../../../../../../../../../shared/copy.js'
import { CYA_SLUG } from '../../../../../../../../../shared/kit.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { addressesPage } from '../../../../addresses/page.js'
import { PARTIES } from '../../../../addresses/parties.js'
import { partyEditHref } from '../../../../addresses/party-edit/edit-href.js'
import { cphApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

/**
 * The roles and addresses summary card: one row per party, a CPH row when CPH
 * applies and, unless read-only, a card Change action to the addresses page and
 * an edit link on each party row.
 *
 * @param {object} options
 * @param {string} options.journeyId - the journey the card belongs to.
 * @param {string[]} options.changeLinkTrail - the trail a link from the review carries.
 * @param {string[]} options.reviewPageTrail - the trail the review itself carries.
 * @param {object} options.answers - the journey's answers.
 * @param {boolean} options.readOnly - true to omit every Change action and edit link.
 * @param {object} [options.parties] - the stored party copies in display shape; defaults to `answers`.
 * @param {object} [options.partyErrors] - the error text per party id.
 * @returns {object} the summary card.
 */
export const rolesAndAddressesCard = ({
  journeyId,
  changeLinkTrail,
  reviewPageTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {}
}) => ({
  id: 'rolesAndAddresses',
  title: copy.cards.rolesAndAddresses,
  ...editableActions({
    readOnly,
    actions: cardAction(
      journeyId,
      changeLinkTrail,
      addressesPage.slug,
      copy.hidden.cards.rolesAndAddresses
    )
  }),
  rows: [
    ...PARTIES.map((party) =>
      partyRow(copy.rows[party.id], parties[party.id], {
        errorText: partyErrors[party.id],
        editHref: readOnly
          ? undefined
          : partyEditHref(journeyId, party, CYA_SLUG, reviewPageTrail)
      })
    ),
    ...(cphApplies(answers)
      ? [row(copy.rows.cph, answers.countyParishHoldingCph)]
      : [])
  ]
})
