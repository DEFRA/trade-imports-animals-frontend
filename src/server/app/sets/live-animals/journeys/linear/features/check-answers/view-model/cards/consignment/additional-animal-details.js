import * as certification from '../../../../../../../../../services/certification-purposes/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { additionalDetailsPage } from '../../../../additional-details/page.js'
import { unweanedApplies } from '../../applicability.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

const additionalDetailsInJourney = (scope) =>
  scope.has('animalsCertifiedFor') || scope.has('containsUnweanedAnimals')

/**
 * What the animals are certified for, and whether any of them are unweaned.
 * Both come from the page the card is named for, so its one Change link
 * reaches every row. The card stands only with a row to show, and its Change
 * link only while that page is part of the notification's journey.
 */
export const additionalAnimalDetailsCard = (
  journeyId,
  answers,
  scope,
  readOnly
) => {
  const rows = [
    ...(scope.has('animalsCertifiedFor')
      ? [
          row(
            copy.rows.certifiedFor,
            certification.certificationLabel(answers.animalsCertifiedFor) ?? ''
          )
        ]
      : []),
    ...(unweanedApplies(answers)
      ? [
          row(
            copy.rows.unweaned,
            copy.yesNo[answers.containsUnweanedAnimals] ?? ''
          )
        ]
      : [])
  ]
  if (rows.length === 0) {
    return null
  }
  return {
    id: 'additionalAnimalDetails',
    title: copy.cards.additionalAnimalDetails,
    ...editableActions(
      readOnly || !additionalDetailsInJourney(scope),
      changeAction(
        journeyId,
        additionalDetailsPage.slug,
        copy.hidden.cards.additionalAnimalDetails
      )
    ),
    rows
  }
}
