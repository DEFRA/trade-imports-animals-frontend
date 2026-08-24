import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { cphApplies } from '../../applicability.js'
import { outstandingPartyErrors } from '../../outstanding-parties.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

/** `parties` carries the same party answers with their address-book references
 * resolved to current details. It defaults to `answers` so a caller holding only
 * inline addresses renders exactly as before. */
export const rolesAndAddressesCard = (
  journeyId,
  answers,
  readOnly,
  parties = answers,
  partyErrors = readOnly ? {} : outstandingPartyErrors(parties)
) => ({
  title: copy.cards.rolesAndAddresses,
  rows: [
    partyRow(
      journeyId,
      readOnly,
      copy.rows.placeOfOrigin,
      parties.placeOfOrigin,
      'placeOfOrigin'
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.consignor,
      parties.consignor,
      'consignor',
      { errorText: partyErrors.consignor }
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.consignee,
      parties.consignee,
      'consignee',
      { errorText: partyErrors.consignee }
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.importer,
      parties.importer,
      'importer',
      { errorText: partyErrors.importer }
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.placeOfDestination,
      parties.placeOfDestination,
      'placeOfDestination',
      { errorText: partyErrors.placeOfDestination }
    ),
    ...(cphApplies(answers)
      ? [
          row(
            journeyId,
            readOnly,
            copy.rows.cph,
            answers.countyParishHoldingCph,
            'countyParishHoldingCph'
          )
        ]
      : [])
  ]
})
