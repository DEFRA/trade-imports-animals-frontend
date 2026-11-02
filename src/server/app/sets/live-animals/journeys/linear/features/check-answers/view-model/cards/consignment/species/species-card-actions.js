import { consignmentDetailsPage } from '../../../../../commodities/page.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { cardAction } from '../../../rows/change-link.js'

const copy = copyFor({ en, cy })

/** The species card's Change action, linking to the consignment-details page. */
export const speciesCardActions = (journeyId, index) =>
  cardAction(
    journeyId,
    consignmentDetailsPage.slug,
    copy.hidden.commodity(index + 1)
  )
