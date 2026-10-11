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
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const TRANSIT = 'transit'

const portOfExitText = async (answers) =>
  (await ports.label(answers.portOfExit)) ?? answers.portOfExit

const destinationCountryRows = async (answers, scope) =>
  destinationCountryApplies(answers, scope)
    ? [
        row(
          copy.rows.destinationCountry,
          await countries.originDisplayLabel(answers.destinationCountry)
        )
      ]
    : []

// A transit reads its exit border control post, then its destination country.
const transitExitRows = async (answers, scope) => [
  ...(portOfExitApplies(answers, scope)
    ? [row(copy.rows.exitBorderControlPost, await portOfExitText(answers))]
    : []),
  ...(await destinationCountryRows(answers, scope))
]

const otherExitRows = async (answers, scope) => [
  ...(await destinationCountryRows(answers, scope)),
  ...(exitDateApplies(answers, scope)
    ? [row(copy.rows.exitDate, dateText(answers.exitDate))]
    : []),
  ...(portOfExitApplies(answers, scope)
    ? [row(copy.rows.portOfExit, await portOfExitText(answers))]
    : [])
]

// The exit answers the chosen reason for import asks for. Each row stands only
// while its obligation is in scope, so the review shows an exit answer exactly
// when one was asked for.
const exitRows = (answers, scope) =>
  answers.reasonForImport === TRANSIT
    ? transitExitRows(answers, scope)
    : otherExitRows(answers, scope)

/**
 * Design release 1 gives the reason for import a card of its own rather than
 * folding it in among the animal details. Every row here comes from the
 * reason-for-import page, so the card's one Change link reaches all of them —
 * which the Additional details card could not do while it held them. A transit
 * reads its exit border control post before its destination country.
 */
export const reasonForImportCard = async (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  id: 'reasonForImport',
  title: copy.cards.reasonForImport,
  ...editableActions(
    readOnly,
    changeAction(
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
    ...(await exitRows(answers, scope))
  ]
})
