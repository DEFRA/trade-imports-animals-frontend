import { pagePath } from '../../../../../../../../shared/paths.js'
import {
  pageOfObligation,
  slugOfPage
} from '../../../../../../../../flow/dispatch.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const withChange = (href) => `${href}?change=1`

export const changeHref = (journeyId, obligationId) =>
  withChange(pagePath(journeyId, slugOfPage(pageOfObligation(obligationId))))

/**
 * The one Change link a card carries, level with its title (design release 1).
 * Rows carry none: a card is a page's worth of answers, so the card says once
 * where they are changed.
 *
 * The card names its page rather than deriving it from a row, because a card's
 * rows can span two pages — arrival details shows the transit countries the
 * transit-countries page collects, and roles and addresses shows the CPH number
 * the CPH page collects. A card normally has one destination, so the card has
 * to say which one, and it says the page the hub's own task row leads with. A
 * card whose rows span a conditional second page may carry a second item for
 * it: the arrival-details card builds its items from two of these calls when
 * the transited-countries row stands.
 */
export const cardAction = (journeyId, slug, visuallyHiddenText) => ({
  items: [
    {
      href: withChange(pagePath(journeyId, slug)),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})

export const editableActions = (readOnly, actions) =>
  readOnly ? {} : { actions }
