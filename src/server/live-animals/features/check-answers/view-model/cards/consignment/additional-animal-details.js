import * as importReasonPurpose from '../../../../../services/import-reason-purpose/index.js'
import * as certification from '../../../../../services/certification-purposes/index.js'
import { copyFor } from '../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { purposeApplies, unweanedApplies } from '../../applicability.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

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
      : [])
  ]
})
