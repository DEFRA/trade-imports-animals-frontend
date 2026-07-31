import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { arrivalDetailsCard } from '../cards/movement/arrival-details.js'
import { transportDetailsCard } from '../cards/movement/transport-details.js'

const copy = copyFor({ en, cy })

export const movementSection = (journeyId, answers, scope, readOnly) => {
  return {
    heading: copy.sections.movement,
    groups: [
      {
        heading: null,
        cards: [
          arrivalDetailsCard(journeyId, answers, scope, readOnly),
          transportDetailsCard(journeyId, answers, scope, readOnly)
        ]
      }
    ]
  }
}
