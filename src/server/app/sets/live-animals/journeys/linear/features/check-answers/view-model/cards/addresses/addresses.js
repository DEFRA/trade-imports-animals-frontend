import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { addressesPage } from '../../../../addresses/page.js'
import { PARTIES } from '../../../../addresses/parties.js'
import { cphNumberWithSlashes } from '../../../../cph-number/cph-number.js'
import { cphApplies } from '../../applicability.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

const permanentAddressGroups = (permanentAddresses) => {
  const rows = permanentAddresses
    .filter(({ permanentAddress }) => permanentAddress)
    .map(({ label, permanentAddress }) => partyRow(label, permanentAddress))
  return rows.length > 0
    ? [{ heading: copy.groups.permanentAddress, rows }]
    : []
}

/**
 * The addresses summary card: one row per party, a CPH row when CPH applies,
 * a "Permanent address" group with one row per animal holding a saved
 * permanent address and, unless read-only, a card Change action to the
 * addresses page. No row carries a link of its own.
 *
 * @param {object} options
 * @param {string} options.journeyId - the journey the card belongs to.
 * @param {string[]} options.changeLinkTrail - the trail a link from the review carries.
 * @param {object} options.answers - the journey's answers.
 * @param {boolean} options.readOnly - true to omit the card Change action.
 * @param {object} [options.parties] - the stored party copies in display shape; defaults to `answers`.
 * @param {object} [options.partyErrors] - the error text per party id.
 * @param {{label: string, permanentAddress: (object|undefined)}[]} [options.permanentAddresses] -
 * an animal with no saved address contributes no row, and none at all leaves out the group.
 * @returns {object} the summary card.
 */
export const addressesCard = ({
  journeyId,
  changeLinkTrail,
  answers,
  readOnly,
  parties = answers,
  partyErrors = {},
  permanentAddresses = []
}) => ({
  id: 'addresses',
  title: copy.cards.addresses,
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      addressesPage.slug,
      copy.hidden.cards.addresses
    )
  }),
  rows: [
    ...PARTIES.map((party) =>
      partyRow(copy.rows[party.id], parties[party.id], {
        errorText: partyErrors[party.id]
      })
    ),
    ...(cphApplies(answers)
      ? [
          row(
            copy.rows.cph,
            cphNumberWithSlashes(answers.countyParishHoldingCph)
          )
        ]
      : [])
  ],
  groups: permanentAddressGroups(permanentAddresses)
})
