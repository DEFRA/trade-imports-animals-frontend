import * as certification from '../../../../../../../../../services/certification-purposes/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { additionalDetailsPage } from '../../../../additional-details/page.js'
import { unweanedApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

/**
 * What the animals are certified for, and whether any of them are unweaned.
 * Both come from the page the card is named for, so its one Change link
 * reaches every row. The reason for import used to sit here too and now has a
 * card of its own, under design release 1's "Main reason for import".
 */
export const additionalAnimalDetailsCard = (journeyId, answers, readOnly) => ({
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
      : [])
  ]
})
