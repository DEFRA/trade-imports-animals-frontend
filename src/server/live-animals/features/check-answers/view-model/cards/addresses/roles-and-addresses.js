import { copyFor } from '../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { cphApplies } from '../../applicability.js'
import { partyRow } from '../../rows/party-row.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const rolesAndAddressesCard = (journeyId, answers, readOnly) => ({
  title: copy.cards.rolesAndAddresses,
  rows: [
    partyRow(
      journeyId,
      readOnly,
      copy.rows.placeOfOrigin,
      answers.placeOfOrigin,
      'placeOfOrigin'
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.consignor,
      answers.consignor,
      'consignor'
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.consignee,
      answers.consignee,
      'consignee'
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.importer,
      answers.importer,
      'importer'
    ),
    partyRow(
      journeyId,
      readOnly,
      copy.rows.placeOfDestination,
      answers.placeOfDestination,
      'placeOfDestination'
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
