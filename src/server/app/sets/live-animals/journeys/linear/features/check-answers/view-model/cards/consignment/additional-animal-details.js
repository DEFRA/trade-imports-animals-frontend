import * as importReasonPurpose from '../../../../../../../../../services/import-reason-purpose/index.js'
import * as certification from '../../../../../../../../../services/certification-purposes/index.js'
import * as countries from '../../../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import {
  destinationCountryApplies,
  exitDateApplies,
  portOfExitApplies,
  purposeApplies,
  unweanedApplies
} from '../../applicability.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

// The exit answers the chosen reason for import asks for. Each row stands only
// while its obligation is in scope, and its Change link resolves through the
// obligation to the reason-for-import page that collects it.
const exitRows = (journeyId, answers, scope, readOnly) => [
  ...(destinationCountryApplies(answers, scope)
    ? [
        row(
          journeyId,
          readOnly,
          copy.rows.destinationCountry,
          countries.originLabel(answers.destinationCountry) ??
            answers.destinationCountry,
          'destinationCountry'
        )
      ]
    : []),
  ...(exitDateApplies(answers, scope)
    ? [
        row(
          journeyId,
          readOnly,
          copy.rows.exitDate,
          dateText(answers.exitDate),
          'exitDate'
        )
      ]
    : []),
  ...(portOfExitApplies(answers, scope)
    ? [
        row(
          journeyId,
          readOnly,
          copy.rows.portOfExit,
          ports.label(answers.portOfExit) ?? answers.portOfExit,
          'portOfExit'
        )
      ]
    : [])
]

export const additionalAnimalDetailsCard = (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  title: copy.cards.additionalAnimalDetails,
  rows: [
    row(
      journeyId,
      readOnly,
      copy.rows.certifiedFor,
      certification.certificationLabel(answers.animalsCertifiedFor) ?? '',
      'animalsCertifiedFor'
    ),
    ...(unweanedApplies(answers)
      ? [
          row(
            journeyId,
            readOnly,
            copy.rows.unweaned,
            copy.yesNo[answers.containsUnweanedAnimals] ?? '',
            'containsUnweanedAnimals'
          )
        ]
      : []),
    row(
      journeyId,
      readOnly,
      copy.rows.reasonForImport,
      importReasonPurpose.reasonLabel(answers.reasonForImport) ?? '',
      'reasonForImport'
    ),
    ...(purposeApplies(answers, scope)
      ? [
          row(
            journeyId,
            readOnly,
            copy.rows.purpose,
            importReasonPurpose.purposeLabel(answers.purposeInInternalMarket) ??
              '',
            'purposeInInternalMarket'
          )
        ]
      : []),
    ...exitRows(journeyId, answers, scope, readOnly)
  ]
})
