import * as importReasonPurpose from '../../../../../../../../../services/import-reason-purpose/index.js'
import * as certification from '../../../../../../../../../services/certification-purposes/index.js'
import * as countries from '../../../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { additionalDetailsPage } from '../../../../additional-details/page.js'
import {
  destinationCountryApplies,
  exitDateApplies,
  portOfExitApplies,
  purposeApplies,
  unweanedApplies
} from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

// The exit answers the chosen reason for import asks for. Each row stands only
// while its obligation is in scope. They are collected on the reason-for-import
// page rather than this card's own, so the card's one Change link does not
// reach them — see the note on the card itself.
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
 * The card's rows span two pages: this card's namesake collects what the
 * animals are certified for and whether any are unweaned, and the
 * reason-for-import page collects the reason, the purpose and the exit answers.
 * The one Change link goes to the page the card is named for, which is also the
 * page the trader would expect "Change additional animal details" to open. The
 * reason-for-import page stays reachable from its own task row on the hub.
 */
export const additionalAnimalDetailsCard = (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  id: 'additionalAnimalDetails',
  title: copy.cards.additionalAnimalDetails,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      additionalDetailsPage.slug,
      copy.hidden.cards.additionalAnimalDetails
    )
  ),
  rows: [
    row(
      copy.rows.certifiedFor,
      certification.certificationLabel(answers.animalsCertifiedFor) ?? ''
    ),
    ...(unweanedApplies(answers)
      ? [
          row(
            copy.rows.unweaned,
            copy.yesNo[answers.containsUnweanedAnimals] ?? ''
          )
        ]
      : []),
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
