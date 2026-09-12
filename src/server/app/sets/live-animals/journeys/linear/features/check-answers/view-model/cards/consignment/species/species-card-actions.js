import { consignmentDetailsPage } from '../../../../../commodities/page.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { cardAction } from '../../../rows/change-link.js'

const copy = copyFor({ en, cy })

/** One link, like every other card on the review (design release 1). It goes to
 * the consignment-details page, which collects the commodity line itself; the
 * animal identifiers the card also shows are collected on their own page, which
 * keeps its own task row on the hub. */
export const speciesCardActions = (journeyId, index) =>
  cardAction(
    journeyId,
    consignmentDetailsPage.slug,
    copy.hidden.commodity(index + 1)
  )
