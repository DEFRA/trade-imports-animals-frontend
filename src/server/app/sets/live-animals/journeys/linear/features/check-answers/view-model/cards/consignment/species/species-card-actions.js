import { pagePath } from '../../../../../../../../../../config.js'
import {
  animalIdentificationPage,
  consignmentDetailsPage
} from '../../../../../commodities/page.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { withChange } from '../../../rows/change-link.js'

const copy = copyFor({ en, cy })

export const speciesCardActions = (journeyId, index, units) => ({
  items: [
    {
      href: withChange(pagePath(journeyId, consignmentDetailsPage.slug)),
      text: copy.change,
      visuallyHiddenText: copy.hidden.commodity(index + 1)
    },
    ...(units.length
      ? [
          {
            href: `${withChange(
              pagePath(journeyId, animalIdentificationPage.slug)
            )}#identification-card-${index}`,
            text: copy.change,
            visuallyHiddenText: copy.hidden.identifiersForCommodity(index + 1)
          }
        ]
      : [])
  ]
})
