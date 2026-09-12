import * as countries from '../../../../../../../../../services/countries/index.js'
import * as importReasonPurpose from '../../../../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { importReasonPage } from '../../../../import-reason/page.js'
import {
  destinationCountryApplies,
  exitDateApplies,
  portOfExitApplies,
  purposeApplies
} from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

// The exit answers the chosen reason for import asks for. Each row stands only
// while its obligation is in scope, so the review shows an exit answer exactly
// when one was asked for.
const exitRows = (answers, scope) => [
  ...(destinationCountryApplies(answers, scope)
    ? [
        row(
          copy.rows.destinationCountry,
          countries.originLabel(answers.destinationCountry) ??
            answers.destinationCountry
        )
      ]
    : []),
  ...(exitDateApplies(answers, scope)
    ? [row(copy.rows.exitDate, dateText(answers.exitDate))]
    : []),
  ...(portOfExitApplies(answers, scope)
    ? [
        row(
          copy.rows.portOfExit,
          ports.label(answers.portOfExit) ?? answers.portOfExit
        )
      ]
    : [])
]

/**
 * Design release 1 gives the reason for import a card of its own rather than
 * folding it in among the animal details. Every row here comes from the
 * reason-for-import page, so the card's one Change link reaches all of them —
 * which the Additional animal details card could not do while it held them.
 */
export const reasonForImportCard = (journeyId, answers, scope, readOnly) => ({
  id: 'reasonForImport',
  title: copy.cards.reasonForImport,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      importReasonPage.slug,
      copy.hidden.cards.reasonForImport
    )
  ),
  rows: [
    row(
      copy.rows.reasonForImport,
      importReasonPurpose.reasonLabel(answers.reasonForImport) ?? ''
    ),
    ...(purposeApplies(answers, scope)
      ? [
          row(
            copy.rows.purpose,
            importReasonPurpose.purposeLabel(answers.purposeInInternalMarket) ??
              ''
          )
        ]
      : []),
    ...exitRows(answers, scope)
  ]
})
